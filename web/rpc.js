(function(juice, site, jQuery) {

     var assert_spec_is_valid       // throws an exception if a specification is improperly formatted
     ,   current_namespace
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

     juice.event.register("juice.rpc_failure");

     assert_spec_is_valid = function(spec) {
         if (juice.is_string(spec)) {
             if (spec.charAt(spec.length-1) === "?") {
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
             if (spec.length === 1) {
                 assert_spec_is_valid(spec[0]);
             }
             else if (spec.length === 0) {
                 juice.error.raise("bad_spec: array or enum without values",
                                   {actual: spec});
             }
             else {
                 if (!juice.all(spec, juice.is_string)) {
                     juice.error.raise("bad_spec: All enumeration values must be strings");
                 }
             }
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
     //     spec   := object | array | scalar | null | enum
     //     scalar := "boolean" | "integer" | "string" | "any" | "scalar"
     //     array  := [ spec ]
     //     enum   := [ "enum_0", ..., "enum_N" ]
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
     // value. (7) The enum spec is an array consisting of 2 or more strings.
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
                 if (spec.length === 1) {
                     if (juice.is_array(data)) {
                         for (i = 0; i < data.length; i++) {
                             helper(spec[0], data[i]);
                         }
                     }
                     else {
                         add_error("array", data);
                     }
                 }
                 else {
                     if (juice.is_string(data)) {
                         if (!juice.inlist(data, spec)) {
                             add_error("enum (" + spec.join(", ") + ")", data);
                         }
                     }
                     else {
                         add_error("enum( " + spec.join(", ") + ")", data);
                     }
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

     lib.lookup = function(spec) {
         var parts;
         spec = juice.spec(spec, {lib_name: undefined,
                                  pkg_name: undefined,
                                  name: undefined});
         parts = [spec.lib_name, "rpcs", spec.pkg_name, spec.name];
         try {
             return juice.mget(site.lib, parts);
         }
         catch (e) {
             throw juice.error.chain("can't find rpc (" + parts.join(".") + ")", e);
         }
     };

     // +----------------+
     // | rpc definition |
     // +----------------+

     lib.define = function(spec) {
         var qualified_name, rpc;

         spec = juice.sloppy_spec(spec, {name: undefined,
                                         req_spec: undefined,
                                         rsp_spec: undefined});

         qualified_name = current_namespace.qualify(spec.name);

         assert_spec_is_valid(spec.req_spec);
         assert_spec_is_valid(spec.rsp_spec);

         rpc = function(args, success_fn, failure_fn) {
             var call_when_finished, do_validate;

             call_when_finished = juice.util.loading();

             do_validate = function(spec_type, my_args) {
                 var errors = validate_against_spec(spec[spec_type], my_args);
                 if (errors.length > 0) {
                     juice.error.raise(qualified_name + ": " + spec_type + "_mismatch",
                                       {spec: juice.dump(spec[spec_type]),
                                        errors: juice.dump(errors),
                                        data: juice.dump(my_args)});
                 }
             };

             do_validate("req_spec", args);

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

         rpc.namespace = current_namespace;
         rpc.name = spec.name;
         rpc.qualified_name = qualified_name;
         rpc.req_spec = spec.req_spec;
         rpc.rsp_spec = spec.rsp_spec;
         rpc.spec = spec;

         if (current_namespace.contains(spec.name)) {
             juice.error.raise(qualified_name + " already defined");
         }
         current_namespace.def(spec.name, rpc);
     };



     // +---------------+
     // | documentation |
     // +---------------+

     (function() {
          juice.rpc.doc = {
              define: function(rpc_name, doc_string) {
                  if (!current_namespace.contains(rpc_name)) {
                      juice.error.raise("attempt to document an undefined rpc: "
                                        + current_namespace.qualify(rpc_name));
                  }

                  current_namespace.qualify(rpc_name).doc_string = doc_string;
              }
          };
      })();


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
                  conf = {"default": true};
              }
          };

          lib.mock = {

              // Returns true if support for mocked rpcs has been compiled
              // into the system, false otherwise.

              is_enabled: function() {
                  return site.settings.config.rpc_mocking;
              },

              // Specifies how the specified rpc should be mocked. `rpc_name`
              // should be an rpc name without its library or package.
              // `states` should contain key-value pairs that indicate the
              // various mocked states provides by this rpc. If a state's
              // value is a function, it will be called with the rpc's
              // arguments and its return value will be used.

              define: function(rpc_name, states) {
                  var qualified_name = current_namespace.qualify(rpc_name);
                  init_conf();
                  if (!current_namespace.contains(rpc_name)) {
                      juice.error.raise("attempt to mock an undefined rpc: " + qualified_name);
                  }

                  // Store `states` in an attribute named "mock" inside the
                  // actual rpc object. This makes it easy to retrieve later,
                  // i.e. when the rpc gets called.

                  current_namespace.get(rpc_name).mock = states;
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
                  var assert_bool, parts;

                  assert_bool = function() {
                      if (!juice.is_boolean(how)) {
                          juice.error.raise("mocked state must be true|false unless mocking a specific rpc");
                      }
                  };

                  init_conf();

                  what = juice.namespace.parse(what);

                  if (what.pkg_type && what.pkg_type != "rpcs") {
                      juice.error.raise("invalid rpc specification: "+what);
                  }

                  // Only specific rpcs may be assigned non-rpcs
                  // mock states; otherwise we're configuring a
                  // library or a package.

                  if (!what.fn_name) {
                      assert_bool();
                  }

                  // Depending on the number of parts in "what", we're configuring a single
                  // rpc, a package of rpcs, or an entire library.

                  if (what.lib_name !== "*") {
                      what.assert_exists();
                  }

                  if (what.lib_name === "" || what.lib_name === "*") {
                      conf = {"default": how};
                  }
                  else {
                      parts = ["libs"].concat(what.split());
                      if (what.fn_name) {
                          juice.mset(conf, how, parts);
                      }
                      else {
                          juice.mset(conf, {"default": how}, parts);
                      }
                  }
              },

              // Returns the mocking state for the given rpc: either true
              // (choose the first state), false (don't mock this rpc), or a
              // string (indicates which named state to use).

              state: function(rpc) {
                  var keys, namespace;
                  if (!juice.rpc.mock.is_enabled()) {
                      juice.log("mocking is disabled");
                      return false;
                  }
                  // This code is wrong

                  namespace = rpc.qualified_name;
                  keys = ["libs"].concat(namespace.split());

                  init_conf();
                  if (juice.mhas(conf, keys)) {
                      return juice.mget(conf, keys);
                  }

                  // Package name level
                  namespace = namespace.unqualify();
                  keys = ["libs"].concat(namespace.split());
                  if (juice.mhas(conf, keys, "default")) {
                      return juice.mget(conf, keys, "default");
                  }

                  // Library level
                  namespace = namespace.unqualify().unqualify();
                  keys = ["libs"].concat([namespace.split()]);
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

                  if (!juice.is_object(response) ||
                      (!response.hasOwnProperty("data") && !response.hasOwnProperty("error")))
                  {
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
         if ((answer = (proxy_map[rpc.namespace.toString()] || proxy_map[rpc.namespace.lib_name]))) {
             return answer;
         }
         if (default_proxy) {
             return default_proxy;
         }
         return juice.error.raise(rpc.qualified_name + ": proxy_not_found");
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
                                                    "rpc mock failure: " + rpc.qualified_name, e));
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
                                 juice.event.publish("juice.rpc_failure", rsp);
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
         var namespace = juice.namespace.make(lib_name, "rpcs", pkg_name);

         if (current_namespace) {
             juice.error.raise(namespace + " nested inside " + current_namespace);
         }
         current_namespace = namespace;
         constructor(juice, site, jQuery);
         current_namespace = null;
     };

 })(juice, site, jQuery);
