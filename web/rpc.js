(function(juice, site, jQuery) {

     var assert_mocking_enabled
     ,   assert_spec_is_valid       // throws an exception if a specification is improperly formatted
     ,   call_with_random_delay     // used only for mocked rpcs; simulates network latency
     ,   current_namespace
     ,   debug                      // if debugging is enabled, logs rpc info to the console
     ,   default_failure_handler    // handles rpc errors when caller doesn't provide a failure_fn
     ,   default_proxy              // the non namespace-specific proxy function
     ,   find_proxy                 // looks up the proxy function for a specified rpc
     ,   get_mock_cookie            // returns value of "rpc.mock" key in juice cookie
     ,   is_mocking_enabled         // tests whether this build supports mocked rpcs at all
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
                     juice.log('[debug] rpc = '+rpc+'; args = '+juice.dump(args));
                     executed.push({rpc: rpc, args: args});
                 };
             }
             else {
                 debug = function() {};
             }
         };

         lib.set_debug = function(on) {
             juice.cookie.set('rpc.debug', !!on);
             set(on);
         };

         lib.executed = function() {
             return executed;
         };

         set(juice.cookie.get('rpc.debug'));
         debug.apply(this, juice.args(arguments));
     };

     assert_spec_is_valid = function(spec) {
         if (juice.is_string(spec)) {
             if (spec[spec.length-1] === '?') {
                 spec = spec.slice(0, -1);
             }
             if (spec !== 'scalar' &&
                 spec !== 'any' &&
                 spec !== 'boolean' &&
                 spec !== 'integer' &&
                 spec !== 'string')
             {
                 juice.error.raise('bad_spec', {spec_type: 'string',
                                                legal_string_values: 'scalar, any, boolean, integer, or string',
                                                actual: spec});
             }
         }
         else if (juice.is_array(spec)) {
             if (spec.length !== 1) {
                 juice.error.raise('bad_spec', {spec_type: 'array', illegal_length: spec.length});
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
             juice.error.raise('bad_spec', {illegal_type: typeof spec});
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
                 if (spec[spec.length-1] === '?') {
                     if (juice.is_null(data)) {
                         return;
                     }
                     spec = spec.slice(0, -1);
                 }
                 if (spec === 'scalar') {
                     if (!juice.is_boolean(data) && !juice.looks_like_integer(data) && !juice.is_string(data)) {
                         add_error('boolean, integer, or string', data);
                     }
                 }
                 else if (spec === 'any') {
                     return;
                 }
                 else if (spec === 'boolean') {
                     if (!juice.is_boolean(data)) {
                         add_error('boolean', data);
                     }
                 }
                 else if (spec === 'integer') {
                     if (!juice.looks_like_integer(data)) {
                         add_error('integer', data);
                     }
                 }
                 else {
                     if (!juice.is_string(data)) {
                         add_error('string', data);
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
                     add_error('array', data);
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
                     add_error('object', data);
                 }
             }
             else {
                 if (!juice.is_null(data)) {
                     add_error('null', data);
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
         var my_namespace = current_namespace.slice(0); // dereference

         assert_spec_is_valid(spec.req_spec);
         assert_spec_is_valid(spec.rsp_spec);

         var rpc = function(args, success_fn, failure_fn) {
             var call_when_finished, do_validate;

             call_when_finished = juice.util.loading();

             do_validate = function(spec_type, my_args) {
                 var errors = validate_against_spec(spec[spec_type], my_args);
                 if (errors.length > 0) {
                     juice.error.raise(spec_type + '_mismatch', {namespace: my_namespace,
                                                                 rpc_name: spec.name,
                                                                 spec: juice.dump(spec[spec_type]),
                                                                 errors: juice.dump(errors),
                                                                 data: juice.dump(my_args)});
                 }
             };

             do_validate('req_spec', args);
             debug(my_namespace + '.' + spec.name, args);

             return find_proxy(rpc).execute(
                 {rpc: rpc,
                  args: args,
                  success_fn: function(data) {
                      call_when_finished();
                      try {
                          do_validate('rsp_spec', data);
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

         rpc.namespace = {
             lib_name: my_namespace[0],
             pkg_name: my_namespace[2],
             toString: function() {
                 return this.lib_name + '.' + this.pkg_name;
             },
             search: function(o) {
                 return o[this.toString()] || o[this.lib_name];
             }
         };
         rpc.name = spec.name;
         rpc.service_name = spec.service_name;
         rpc.req_spec = spec.req_spec;
         rpc.rsp_spec = spec.rsp_spec;

         if (juice.mget(site.lib, current_namespace).hasOwnProperty(rpc.name)) {
             juice.error.raise('rpc_already_defined', {namespace: rpc.namespace, name: rpc.name});
         }
         juice.mget(site.lib, current_namespace)[rpc.name] = rpc;
     };


     // +---------+
     // | mockery |
     // +---------+

     is_mocking_enabled = function() {
         return site.settings.config.rpc_mocking;
     };

     assert_mocking_enabled = function() {
         if (!is_mocking_enabled()) {
             juice.error.raise('rpc_mocking_disabled');
         }
     };

     get_mock_cookie = function() {
         if (juice.cookie.has('rpc.mock')) {
             return juice.cookie.get('rpc.mock');
         }
         if (site.settings.config.mock_rpcs_by_default) {
             return {'*': true};
         }
         return {};
     };

     // Specifies how the specified RPC should be mocked. If o is a function,
     // its return value will be passed to the mocking proxy and is assumed to
     // have been generated by either juice.rpc.mock_success or
     // juice.rpc.mock_failure (see below). If o is not a function, however,
     // it will be passed to juice.rpc.mock_success, then to the mocking
     // proxy.

     lib.define_mock = function(name, o) {
         if (!juice.mhas(site.lib, current_namespace)) {
             juice.error.raise('Current namespace not found',
                                {namespace: current_namespace});
         }
         if (!juice.mhas(site.lib, current_namespace, name)) {
             juice.error.raise('Attempt to mock an undefined rpc',
                               {name: name,
                                namespace: current_namespace});
         }
         juice.mset(site.lib, o, current_namespace, name, 'mock');
     };

     // The function passed to juice.rpc.define_mock should use this function
     // to return a successful response.

     lib.mock_success = function(data) {
         return {data: juice.deep_copy(data)};
     };

     // The function passed to juice.rpc.define_mock should use this function
     // to indicate an error response.

     lib.mock_failure = function(code, message, data) {
         return {error: {code: code, message: message, data: data}};
     };

     // Tells juice to enable mocking for RPCs in the specified namespace.

     lib.mock_namespace = function(namespace) {
         var mock;
         assert_mocking_enabled();
         mock = get_mock_cookie();
         mock[namespace] = true;
         juice.cookie.set('rpc.mock', mock);
     };

     // Tells juice to enable mocking for all RPCs.

     lib.mock_all = function() {
         assert_mocking_enabled();
         juice.cookie.set('rpc.mock', {'*': true});
     };

     // Tells juice to disable mocking for all RPCs.

     lib.mock_none = function() {
         assert_mocking_enabled();
         juice.cookie.set('rpc.mock', {});
     };

     // Returns an object whose keys are the namespaces that are currently
     // being mocked. If juice.rpc.mock_all was called, returns the object
     // {"*":true}.

     lib.whats_mocked = function() {
         assert_mocking_enabled();
         return get_mock_cookie('rpc.mock');
     };

     // +------------------+
     // | proxy management |
     // +------------------+

     proxy_map = {};

     find_proxy = function(rpc) {
         var answer, mock;
         if (is_mocking_enabled()) {
             mock = get_mock_cookie();
             if (mock.hasOwnProperty('*') || rpc.namespace.search(mock)) {
                 return mocking_proxy;
             }
         }
         if ((answer = rpc.namespace.search(proxy_map))) {
             return answer;
         }
         if (default_proxy) {
             return default_proxy;
         }
         return juice.error.raise('proxy_not_found', {namespace: rpc.namespace});
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

     call_with_random_delay = function(rpc, fn) {
         setTimeout(function() {
                        try {
                            fn();
                        }
                        catch (e) {
                            juice.error.handle(juice.error.chain('rpc mock failure: ' + rpc.namespace + '.' + rpc.name, e));
                        }
                    },
                    Math.random() * 1000);

     };

     // This is the built-in proxy for mocked RPC responses. It expects the
     // RPC mocking function to return a value generated by either
     // juice.rpc.mock_success or juice.rpc.mock_failure.

     mocking_proxy = make_proxy_startable(
         function(requests) {
             juice.foreach(
                 requests,
                 function(req) {
                     call_with_random_delay(
                         req.rpc,
                         function() {
                             var rsp = juice.is_function(req.rpc.mock)
                                 ? req.rpc.mock(req.args) : juice.rpc.mock_success(req.rpc.mock);

                             if (rsp.hasOwnProperty('data')) { // see mock_success
                                 req.success_fn(rsp.data);
                             }
                             else if (rsp.hasOwnProperty('error') && req.failure_fn) { // see mock_failure
                                 req.failure_fn(rsp.error);
                             }
                             else {
                                 juice.event.publish('service-failure', rsp);
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
                              juice.error.raise('proxy_already_exists', {namespace: n});
                          }
                          proxy_map[n] = proxy;
                      });
     };

     lib.start = function() {
         juice.foreach(proxy_map, function(n, p) { p.start(); });
         default_proxy.start();
         if (is_mocking_enabled()) {
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
             juice.error.raise('nested rpc package', {current_namespace: current_namespace,
                                                      lib_name: lib_name,
                                                      pkg_name: pkg_name});
         }
         namespace = [lib_name, 'rpcs', pkg_name];
         current_namespace = namespace;
         constructor(juice, site, jQuery);
         current_namespace = null;
     };

 })(juice, site, jQuery);

(function(juice, site, jQuery) {
     var make_boxcar_helper;

     juice.event.register('service-failure');

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
                                                        if (rsp.hasOwnProperty('data')) {
                                                            req.success_fn(rsp.data);
                                                        }
                                                        else if (rsp.hasOwnProperty('error') && req.failure_fn) {
                                                            req.failure_fn(rsp.error);
                                                        }
                                                        else {
                                                            juice.event.publish('service-failure', rsp);
                                                        }
                                                    });
             jQuery.ajax(
                 {data: boxcar_helper.get_request_data(),
                  dataType: 'json',
                  error: function(xhr, what, exception) {
                      juice.event.publish('service-failure', {xhr: xhr, what: what, exception: exception});
                  },
                  success: juice.error.make_safe(boxcar_helper.handle_responses),
                  type: 'POST',
                  url: rpc_url.to_string()
                 });
         };
     };

 })(juice, site, jQuery);
