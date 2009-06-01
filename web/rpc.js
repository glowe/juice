(function(juice, site, jQuery) {

     var assert_spec_is_valid       // throws an exception if a specification is improperly formatted
     ,   current_namespace
     ,   debug                      // if debugging is enabled, logs rpc info to the console
     ,   default_failure_handler    // handles rpc errors when caller doesn't provide a failure_fn
     ,   default_proxy              // the non namespace-specific proxy function
     ,   find_proxy                 // looks up the proxy function for a specified rpc
     ,   lib                        // alias for juice.rpc
     ,   make_proxy_startable       // attaches plumbing to user-supplied proxy functions
     ,   mocking_proxy              // the proxy used for all mocked rpcs
     ,   proxy_map                  // maps namespaces to proxy functions
     ,   validate_against_spec      // tests whether a data structure matches its specification
     ;

     juice.rpc = lib = {};

     debug = function() {
         var executed = [], set;

         set = function(on) {
             if (on) {
                 debug = function(rpc, args) {
                     juice.log("[debug] rpc = "+rpc+"; args = "+juice.dump(args));
                     executed.push({rpc: rpc, args: args});
                 };
             }
             else {
                 debug = function() {};
             }
         };

         lib.set_debug = function(on) {
             juice.cookie.set("rpc.debug", !!on);
             set(on);
         };

         lib.executed = function() {
             return executed;
         };

         set(juice.cookie.get("rpc.debug"));
         debug.apply(this, juice.args(arguments));
     };

     assert_spec_is_valid = function(spec) {
         if (juice.is_string(spec)) {
             if (spec[spec.length-1] === "?") {
                 spec = spec.slice(0, -1);
             }
             if (spec !== "scalar" &&
                 spec !== "any" &&
                 spec !== "boolean" &&
                 spec !== "integer" &&
                 spec !== "string")
             {
                 juice.error.raise("bad_spec", {spec_type: "string",
                                                legal_string_values: "scalar, any, boolean, integer, or string",
                                                actual: spec});
             }
         }
         else if (juice.is_array(spec)) {
             if (spec.length !== 1) {
                 juice.error.raise("bad_spec", {spec_type: "array", illegal_length: spec.length});
             }
             assert_spec_is_valid(spec[0]);
         }
         else if (juice.is_object(spec)) {
             juice.foreach(spec,
                           function(n, s) {
                               assert_spec_is_valid(s);
                           });
         }
         else if (!juice.is_null(spec)) {
             juice.error.raise("bad_spec", {illegal_type: typeof spec});
         }
     };

     // validate_against_spec checks that a data structure matches
     // a specification. The specification (spec) is a recursively
     // defined data structure:
     //
     //     spec   := object | array | scalar | null
     //     scalar := "boolean" | "integer" | "string" | "any" | "scalar"
     //     array  := [ spec ]
     //     object := { key_0: spec_0, ... key_N: spec_N }
     //     object := { _: spec }
     //
     // Notes: (1) Any of the scalar strings may end in "?", indicating that
     // null is an acceptable substitute. (2) "scalar" indicates that a
     // boolean, integer, or string is acceptable. (3) "any" indicates that any
     // value is acceptable. (4) The array spec must be contain precisely one
     // spec. (5) The object spec may contain zero or more key-spec pairs. (6)
     // The {_:spec} notation specifies a dictionary with zero or more
     // key-value pairs where we only want to specify the structure of the
     // value.
     //
     // Example specification:
     //
     //     {
     //       foo: "integer",
     //       bar: {x: [ "boolean" ], y: { z: "any", w: "string" } },
     //       baz: [ "scalar?" ],
     //       xyz: {_: ["integer"]}
     //     }
     //
     // Returns true if the data matches the specification, false otherwise.

     validate_against_spec = function(spec, data) {
         var add_error, errors = [], helper;

         add_error = function(expected, data) {
             errors.push({expected_type: expected,
                          actual_type: juice.is_null(data) ? null : typeof data,
                          data: data});
         };

         helper = function(spec, data) {
             var i, k, keys;

             if (juice.is_string(spec)) {
                 if (spec[spec.length-1] === "?") {
                     if (juice.is_null(data)) {
                         return;
                     }
                     spec = spec.slice(0, -1);
                 }
                 if (spec === "scalar") {
                     if (!juice.is_boolean(data) && !juice.looks_like_integer(data) && !juice.is_string(data)) {
                         add_error("boolean, integer, or string", data);
                     }
                 }
                 else if (spec === "any") {
                     return;
                 }
                 else if (spec === "boolean") {
                     if (!juice.is_boolean(data)) {
                         add_error("boolean", data);
                     }
                 }
                 else if (spec === "integer") {
                     if (!juice.looks_like_integer(data)) {
                         add_error("integer", data);
                     }
                 }
                 else {
                     if (!juice.is_string(data)) {
                         add_error("string", data);
                     }
                 }
             }
             else if (juice.is_array(spec)) {
                 if (juice.is_array(data)) {
                     for (i = 0; i < data.length; i++) {
                         helper(spec[0], data[i]);
                     }
                 }
                 else {
                     add_error("array", data);
                 }
             }
             else if (juice.is_object(spec)) {
                 if (juice.is_object(data)) {
                     keys = juice.keys(spec);
                     if (keys.length === 1 && keys[0] === "_") {
                         juice.foreach(data,
                                       function(k,v) {
                                           helper(spec._, data[k]);
                                       });
                     }
                     else {
                         for (i = 0; i < keys.length; i++) {
                             k = keys[i];
                             if (!data.hasOwnProperty(k)) {
                                 errors.push({missing_property: k});
                             }
                             helper(spec[k], data[k]);
                         }
                     }
                 }
                 else {
                     add_error("object", data);
                 }
             }
             else {
                 if (!juice.is_null(data)) {
                     add_error("null", data);
                 }
             }
         };

         helper(spec, data);
         return errors;
     };

     // +----------------+
     // | rpc definition |
     // +----------------+

     lib.define = function(spec) {
         var my_namespace = {
             lib_name: current_namespace[0],
             pkg_name: current_namespace[2],
             toString: function() {
                 return this.lib_name + "." + this.pkg_name;
             },
             search: function(o) {
                 return o[this.toString()] || o[this.lib_name];
             }
         };

         assert_spec_is_valid(spec.req_spec);
         assert_spec_is_valid(spec.rsp_spec);

         var rpc = function(args, success_fn, failure_fn) {
             var call_when_finished, do_validate;

             call_when_finished = juice.util.loading();

             do_validate = function(spec_type, my_args) {
                 var errors = validate_against_spec(spec[spec_type], my_args);
                 if (errors.length > 0) {
                     juice.error.raise(spec_type + "_mismatch", {namespace: my_namespace,
                                                                 rpc_name: spec.name,
                                                                 spec: juice.dump(spec[spec_type]),
                                                                 errors: juice.dump(errors),
                                                                 data: juice.dump(my_args)});
                 }
             };

             do_validate("req_spec", args);
             debug(my_namespace + "." + spec.name, args);

             return find_proxy(rpc).execute(
                 {rpc: rpc,
                  args: args,
                  success_fn: function(data) {
                      call_when_finished();
                      try {
                          do_validate("rsp_spec", data);
                          success_fn(data);
                      }
                      catch (e) {
                          juice.error.handle(e);
                      }
                  },
                  failure_fn: function(error) {
                      call_when_finished();
                      try {
                          if (failure_fn) {
                              if (failure_fn(error) && default_failure_handler) {
                                  default_failure_handler(error);
                              }
                          }
                          else if (default_failure_handler) {
                              default_failure_handler(error);
                          }
                      }
                      catch (e) {
                          juice.error.handle(e);
                      }
                  }
                 });
         };

         rpc.namespace = my_namespace;
         rpc.name = spec.name;
         rpc.service_name = spec.service_name;
         rpc.req_spec = spec.req_spec;
         rpc.rsp_spec = spec.rsp_spec;

         if (juice.mget(site.lib, current_namespace).hasOwnProperty(rpc.name)) {
             juice.error.raise("rpc_already_defined", {namespace: rpc.namespace, name: rpc.name});
         }
         juice.mget(site.lib, current_namespace)[rpc.name] = rpc;
     };


     // +---------+
     // | mocking |
     // +---------+

     (function() {

          var conf, init_conf;

          init_conf = function() {
              if (!juice.rpc.mock.is_enabled()) {
                  juice.error.raise("rpc mocking is disabled");
              }
              if (juice.is_undefined(conf)) {
                  conf = {"default": site.settings.config.mock_rpcs_by_default};
              }
          };

          lib.mock = {

              // Returns true if support for mocked rpcs has been compiled
              // into the system, false otherwise.

              is_enabled: function() {
                  return site.settings.config.rpc_mocking;
              },

              // Specifies how the specified rpc should be mocked. `name`
              // should be an rpc name without its library or package.
              // `states` should contain key-value pairs that indicate the
              // various mocked states provides by this rpc. If a state's
              // value is a function, it will be called with the rpc's
              // arguments and its return value will be used.

              define: function(rpc_name, states) {
                  init_conf();
                  if (!juice.mhas(site.lib, current_namespace)) {
                      juice.error.raise("current namespace not found",
                                        {namespace: current_namespace});
                  }
                  if (!juice.mhas(site.lib, current_namespace, rpc_name)) {
                      juice.error.raise("attempt to mock an undefined rpc",
                                        {rpc_name: rpc_name, namespace: current_namespace});
                  }

                  // Store `states` in an attribute named "mock" inside the
                  // actual rpc object. This makes it easy to retrieve later,
                  // i.e. when the rpc gets called.

                  juice.mset(site.lib, states, current_namespace, rpc_name, "mock");
              },

              // Similar to juice.rpc.mock.define, except this function only
              // lets you define exactly one mocked state.

              define_simple: function(name, state) {
                  juice.rpc.mock.define(name, {first: state});
              },

              // Use this to mock a successful response from an rpc in
              // juice.rpc.mock.define.

              success: function(data) {
                  return {data: juice.deep_copy(data)};
              },

              // Use this to mock an error response from an rpc in
              // juice.rpc.mock.define.

              failure: function(code, message, data) {
                  return {error: {code: code, message: message, data: data}};
              },

              // Tells juice to enable or disable mocking for certain rpcs.
              // `what` may refer to a specific rpc (e.g.
              // "my_library.rpcs.foo_package.the_rpc"), an rpc package (e.g.
              // "my_library.rpcs.foo_package"), or even an entire library
              // (e.g. "my_library" or, equivalently, "my_library.rpcs"). You
              // may also refer to all libraries by setting `what` to "*" or
              // an empty string.
              //
              // When referring to a package, a library, or all libraries,
              // `how` must be a boolean. When configuring a specific rpc,
              // however, `how` can also refer to a particular mocked state of
              // the rpc (see juice.rpc.mock.define).
              //
              // NOTE: config calls should generally be made from least- to
              // most-specific, because the most recent configuration always
              // takes precedence. For example, in
              //
              //    juice.rpc.mock.config("mylib.rpcs.mypkg.foo", true);
              //    juice.rpc.mock.config("mylib.rpcs.mypkg", false);
              //
              // ...the package-level config will override the rpc-level
              // config because it affects the entire package and was applied
              // afterward.

              config: function(what, how) {
                  var assert_bool,
                  assert_in_site,
                  lib_name,
                  parts,
                  pkg_name,
                  rpc_name;

                  assert_bool = function() {
                      if (!juice.is_boolean(how)) {
                          juice.error.raise("mocked state must be true|false unless mocking a specific rpc");
                      }
                  };
                  assert_in_site = function(keys) {
                      if (!juice.mhas(site.lib, keys)) {

                          // Note: Disabled for now because it prevents the
                          // programmer from configuring rpcs during
                          // compilation via the util directory. Also not
                          // sure whether this check is particularly useful.

                          // juice.error.raise("site.lib."+keys.join(".")+" not found");
                      }
                  };

                  init_conf();
                  parts = what.split(".");

                  // The second part, if it exists, must always be the string "rpcs".

                  if (parts.length > 1) {
                      if (parts[1] != "rpcs") {
                          juice.error.raise("invalid rpc specification: "+what);
                      }
                  }

                  // Only specific rpcs may be assigned non-rpcs mock states, and fewer than
                  // four parts indicates we're configuring a library or a package.

                  if (parts.length < 4) {
                      assert_bool();
                  }

                  // Depending on the number of parts in "what", we're configuring a single
                  // rpc, a package of rpcs, or an entire library.

                  if (what === "" || what === "*") {
                      conf = {"default": how};
                  }
                  else if (parts.length == 4) {
                      lib_name = parts[0];
                      pkg_name = parts[2];
                      rpc_name = parts[3];
                      assert_in_site([lib_name, "rpcs", pkg_name, rpc_name]);
                      juice.mset(conf, how, ["libs", lib_name, "pkgs", pkg_name, "rpcs", rpc_name]);
                  }
                  else if (parts.length == 3) {
                      lib_name = parts[0];
                      pkg_name = parts[2];
                      assert_in_site([lib_name, "rpcs", pkg_name]);
                      juice.mset(conf, {"default": how}, ["libs", lib_name, "pkgs", pkg_name]);
                  }
                  else if (parts.length == 2 || parts.length == 1) {
                      lib_name = parts[0];
                      assert_in_site([lib_name, "rpcs"]);
                      juice.mset(conf, {"default": how}, ["libs", lib_name]);
                  }
                  else {
                      juice.error.raise("invalid rpc specification: "+what);
                  }
              },

              // Returns the mocking state for the given rpc: either true
              // (choose the first state), false (don't mock this rpc), or a
              // string (indicates which named state to use).

              state: function(rpc) {
                  var keys;
                  if (!juice.rpc.mock.is_enabled()) {
                      return false;
                  }
                  keys = ["libs", rpc.namespace.lib_name, "pkgs", rpc.namespace.pkg_name, "rpcs", rpc.name];
                  init_conf();
                  if (juice.mhas(conf, keys)) {
                      return juice.mget(conf, keys);
                  }
                  keys = keys.slice(0, -2);  // retry at the package level
                  if (juice.mhas(conf, keys, "default")) {
                      return juice.mget(conf, keys, "default");
                  }
                  keys = keys.slice(0, -2);  // retry at the library level
                  if (juice.mhas(conf, keys, "default")) {
                      return juice.mget(conf, keys, "default");
                  }
                  return !!conf["default"];  // return the system default
              },

              // Creates a mocked response for the given rpc. Expects an
              // actual rpc object, as opposed to the name of one. If
              // juice.rpc.mock.state would return false, this function also
              // returns false. Otherwise, it creates and returns a response
              // object based on how the rpc has been configured.

              make_response: function(rpc, args) {
                  var mock_def, response, state;

                  if ((state = juice.rpc.mock.state(rpc)) === false) {
                      return false;
                  }

                  // Choose the mock definition based on the configured state.

                  if (state === true) {
                      mock_def = juice.first(rpc.mock);
                  }
                  else if (state === "__error__") {
                      mock_def = juice.rpc.mock.failure("generic-error", "Generic RPC Error Message");
                  }
                  else {
                      mock_def = rpc.mock[state];
                  }

                  // If it's a function, call it and return its return value;
                  // otherwise, use it directly.

                  response = juice.is_function(mock_def) ? mock_def(args) : mock_def;

                  // As a programming convenience, if we're certain the
                  // response was passed through neither
                  // juice.rpc.mock.success nor juice.rpc.mock.failure,
                  // convert it to a success object.

                  if (!response.hasOwnProperty("data") && !response.hasOwnProperty("error")) {
                      response = juice.rpc.mock.success(response);
                  }

                  return response;
              },

              // Returns an object indicating which rpcs are currently mocked.
              // This is primarily intended for debugging purposes.

              whats_mocked: function() {
                  init_conf();
                  return juice.deep_copy(conf);
              }
          };

      })();

     // +------------------+
     // | proxy management |
     // +------------------+

     proxy_map = {};

     find_proxy = function(rpc) {
         var answer;
         if (juice.rpc.mock.state(rpc) !== false) {
             return mocking_proxy;
         }
         if ((answer = rpc.namespace.search(proxy_map))) {
             return answer;
         }
         if (default_proxy) {
             return default_proxy;
         }
         return juice.error.raise("proxy_not_found", {namespace: rpc.namespace});
     };

     lib.clear_proxies = function() {
         proxy_map = {};
         default_proxy = undefined;
     };

     make_proxy_startable = function(fn) {
         var that = {},
         pending_requests = [],
         started = false;

         that.start = function() {
             if (started) {
                 return;
             }
             started = true;
             if (pending_requests.length > 0) {
                 try {
                     // This try catch handles ajax errors that
                     // occur before an independent thread is
                     // started.
                     fn(pending_requests);
                 }
                 catch (e) {
                     juice.error.handle(e);
                 }
                 pending_requests = [];
             }
         };

         that.execute = function(request) {
             if (started) {
                 try {
                     // Like the one in that.start, this try catch
                     // handles catastrophic ajax failures.
                     fn([request]);
                  }
                  catch (e) {
                     juice.error.handle(e);
                  }
             }
             else {
                 pending_requests.push(request);
             }
         };

         return that;
     };

     // This is the built-in proxy for mocked rpc responses. It expects the
     // mocked response to be a value generated by either
     // juice.rpc.mock.success or juice.rpc.mock.failure.

     mocking_proxy = make_proxy_startable(
         function(requests) {
             juice.foreach(
                 requests,
                 function(req) {
                     var call_with_random_delay = function(rpc, fn) {
                         setTimeout(
                             function() {
                                        try {
                                            fn();
                                        }
                                        catch (e) {
                                            juice.error.handle(
                                                juice.error.chain(
                                                    "rpc mock failure: " + rpc.namespace + "." + rpc.name, e));
                                        }
                                    },
                                    Math.random() * 1000);
                     };
                     call_with_random_delay(
                         req.rpc,
                         function() {
                             var rsp = juice.rpc.mock.make_response(req.rpc, req.args);
                             if (rsp.hasOwnProperty("data")) { // see juice.rpc.mock.success
                                 req.success_fn(rsp.data);
                             }
                             else if (rsp.hasOwnProperty("error") && req.failure_fn) { // see juice.rpc.mock.failure
                                 req.failure_fn(rsp.error);
                             }
                             else {
                                 juice.event.publish("service-failure", rsp);
                             }
                         });
                 });
         });

     lib.set_proxy = function(proxy_fn, namespaces) {
         var proxy = make_proxy_startable(proxy_fn);

         if (juice.is_undefined(namespaces)) {
             default_proxy = proxy;
             return;
         }

         if (!juice.is_array(namespaces)) {
             namespaces = [namespaces];
         }

         juice.foreach(namespaces,
                      function(n) {
                          if (proxy_map[n]) {
                              juice.error.raise("proxy_already_exists", {namespace: n});
                          }
                          proxy_map[n] = proxy;
                      });
     };

     lib.start = function() {
         juice.foreach(proxy_map, function(n, p) { p.start(); });
         default_proxy.start();
         if (juice.rpc.mock.is_enabled()) {
             mocking_proxy.start();
         }
     };

     lib.set_default_failure_handler = function(fn) {
         var old_fn = default_failure_handler;
         default_failure_handler = fn;
         return old_fn;
     };


     // +---------------------------+
     // | package management system |
     // +---------------------------+

     lib.define_package = function(lib_name, pkg_name, constructor) {
         var namespace;
         if (current_namespace) {
             juice.error.raise("nested rpc package", {current_namespace: current_namespace,
                                                      lib_name: lib_name,
                                                      pkg_name: pkg_name});
         }
         namespace = [lib_name, "rpcs", pkg_name];
         current_namespace = namespace;
         constructor(juice, site, jQuery);
         current_namespace = null;
     };

 })(juice, site, jQuery);

(function(juice, site, jQuery) {
     var make_boxcar_helper;

     juice.event.register("service-failure");

     // Returns an object that encapsulates some of the details associated
     // with creating a boxcar of RPC requests.

     make_boxcar_helper = function(requests, response_handler) {
         var data = {}, request_map = {};

         juice.foreach(requests,
                       function(req) {
                           var tuple = [req.rpc.service_name, req.args],
                           key = hex_sha1(juice.dump(tuple));
                           data[key] = tuple;
                           request_map[key] = request_map[key] || [];
                           request_map[key].push(req);
                       });

         return {
             get_request_data: function() {
                 return {requests: JSON.stringify(data)};
             },
             handle_responses: function(responses) {
                 juice.foreach(responses,
                               function(key, rsp) {
                                   juice.foreach(request_map[key],
                                                 function(req) {
                                                     response_handler(req, rsp);
                                                 });
                               });
             }
         };
     };

     // This is the standard built-in boxcar proxy.

     juice.rpc.create_basic_boxcar_proxy = function(rpc_url) {

         return function(requests) {
             var boxcar_helper = make_boxcar_helper(requests,
                                                    function(req, rsp) {
                                                        if (rsp.hasOwnProperty("data")) {
                                                            req.success_fn(rsp.data);
                                                        }
                                                        else if (rsp.hasOwnProperty("error") && req.failure_fn) {
                                                            req.failure_fn(rsp.error);
                                                        }
                                                        else {
                                                            juice.event.publish("service-failure", rsp);
                                                        }
                                                    });
             jQuery.ajax(
                 {data: boxcar_helper.get_request_data(),
                  dataType: "json",
                  error: function(xhr, what, exception) {
                      juice.event.publish("service-failure", {xhr: xhr, what: what, exception: exception});
                  },
                  success: juice.error.make_safe(boxcar_helper.handle_responses),
                  type: "POST",
                  url: rpc_url.to_string()
                 });
         };
     };

 })(juice, site, jQuery);
