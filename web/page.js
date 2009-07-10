(function(juice, site) {

     var
     active_layout,
     active_page,
     constructor,
     create_page;

     create_page = function(spec) {
         var categorize_arguments,
         extract_dynamic_path_arguments,
         raise_error,
         that = {};

         spec.base = spec.base || site.settings.base_url;
         spec.path = juice.canonicalize_path(spec.path);

         // Make sure "v" is an object for each "k-v" pair in spec.parameters.
         juice.foreach(spec.parameters,
                       function(k, v) {
                           if (!juice.is_object(v)) {
                               spec.parameters[k] = {};
                           }
                       });

         raise_error = function(msg) {
             juice.error.raise('in page "'+spec.name+'": '+msg);
         };

         //
         // Given the arguments provided to this page, divides them into three
         // categories: key-value pairs of recognized parameters; mandatory
         // parameters that were not provided; and parameters whose values did
         // not match the expected pattern.
         //

         categorize_arguments = function(args) {
             var answer = {invalid: [], missing: [], valid: {}};

             if (juice.is_undefined(args)) {
                 args = {};
             }
             else if (!juice.is_object(args)) {
                 raise_error("args type error; actual="+(typeof args));
             }

             juice.foreach(spec.parameters,
                           function(k, details) {
                               var alias = details.alias || k;
                               if (args.hasOwnProperty(alias)) {
                                   if (details.regexp && !details.test(args[alias])) {
                                       answer.invalid.push(k);              // provided, does not match pattern
                                   }
                                   else {
                                       answer.valid[k] = args[alias];       // provided, matches pattern
                                   }
                               }
                               else if (details.hasOwnProperty("default_value")) {
                                   answer.valid[k] = details.default_value; // not provided, has default value
                               }
                               else {
                                   answer.missing.push(k);                  // not provided, required
                               }
                           });

             answer.has_errors = answer.invalid.length || answer.missing.length;
             return answer;
         };

         //
         // Given the path for this current request and an existing dictionary
         // of page arguments, parses dynamic arguments from the path (if any)
         // and injects them into args (and returns it). Because the path is
         // parsed at run-time, it's possible the parse will fail and this
         // function will raise an error; this is the equivalent of a 404.
         //

         extract_dynamic_path_arguments = function(request_path, args) {
             var keys = [], match, vals_pat, vals_re;

             if (!that.path_is_dynamic()) {
                 return args;
             }

             // Accumulate the list of parameter aliases in the path and
             // construct a regexp pattern in vals_pat that will extract their
             // values from the actual request path.

             vals_pat = "^" + spec.path + "$";
             juice.foreach(that.path_parameters(),
                           function(name) {
                               keys.push(spec.parameters[name].alias || name);
                               vals_pat = vals_pat.replace("[[" + name + "]]", "(" + spec.parameters[name].pattern + ")");
                           });
             vals_re = new RegExp(vals_pat, "i");
             match = vals_re.exec(request_path);
             if (!match) {
                 raise_error("request path ("+request_path+") match failed");
             }
             juice.foreach(juice.combine(keys, match.slice(1)), function(k, v) { args[k] = v; });
             return args;
         };

         // simple accessor functions:
         that.name            = function() { return spec.name; };
         that.is_external     = function() { return spec.external; };
         that.title           = function() { return spec.title; };
         that.base            = function() { return spec.base; };
         that.path            = function() { return spec.path; };
         that.parameters      = function() { return spec.parameters; };
         that.script_urls     = function() { return spec.script_urls; };
         that.stylesheet_urls = function() { return spec.stylesheet_urls; };
         that.widget_packages = function() { return spec.widget_packages; };

         //
         // Returns true if this page expects some of its arguments to be
         // passed in via the path, as opposed to the query string.
         //

         that.path_is_dynamic = function() {
             return (/\[\[\w+\]\]/).test(spec.path);
         };

         //
         // Returns a list containing the parameters names found in the path.
         // If the path is not dynamic, this function returns [].
         //

         that.path_parameters = function() {
             var answer = [], match;
             while ((match = /\[\[(\w+)\]\]/gi.exec(spec.path))) {
                 answer.push(match[1]);
             }
             return answer;
         };

         //
         // Returns a url object that points to this page. If args not
         // undefined, it must be a dictionary of valid page arguments.
         //

         that.url = function(args) {
             var categorized_args, query_args = {}, path = spec.path, path_args = {};

             categorized_args = categorize_arguments(args);
             if (categorized_args.has_errors) {
                 raise_error("cannot create url; bad page arguments: "+juice.dump(categorized_args));
             }

             // If our path is dynamic, try to inject each argument into the
             // path. Keep track of which arguments were successfully
             // injected, because they won't be added to the query string.

             if (that.path_is_dynamic()) {
                 juice.foreach(categorized_args.valid,
                               function(k, v) {
                                   var new_path, regexp;
                                   regexp = new RegExp("\\[\\[" + k + "\\]\\]", "g");
                                   new_path = path.replace(regexp, v);
                                   if (path !== new_path) {
                                       path = new_path;
                                       path_args[k] = true;
                                   }
                               });
             }

             // Create a url object, specifying as query string arguments only
             // those that were not injected into the path above.

             juice.foreach(categorized_args.valid,
                           function(k, v) {
                               if (!path_args[k]) {
                                   // Don't bother putting default values in the query string.
                                   if (v !== spec.parameters[k].default_value) {
                                       query_args[(spec.parameters[k].alias || k)] = v;
                                   }
                               }
                           });

             return juice.url.make({base: spec.base, path: path, args: query_args});
         };

         that.draw = function(container, args) {
             var panels_and_widgets;
             active_layout = spec.layout(spec.name);
             container.html(active_layout.to_html());
             try {
                 panels_and_widgets = spec.init_widgets(args);
             }
             catch (e) {
                 juice.error.handle(e);
                 return;
             }
             juice.foreach(panels_and_widgets,
                           function(panel, widgets) {
                               juice.foreach(widgets, function(w) {
                                                 juice.page.add_widget(panel, w);
                                             });
                           });
         };

         //
         // Extract the page arguments from the request path and query string,
         // verify their correctness, draw the page in the given DOM
         // container, and start the RPC subsystem. If the page arguments are
         // invalid, the error page will be initialized instead.
         //

         that.init = function(container) {
             var args, req = juice.url.request();

             try {
                 args = juice.copy_object(req.args);
                 args = extract_dynamic_path_arguments(req.path, args);
                 args = categorize_arguments(args);
                 if (args.has_errors) {
                     throw "page initialization failed; bad arguments";
                 }
                 that.draw(container, args.valid);
                 juice.event.publish("juice.ready");
             }
             catch (e) {
                 juice.error.handle(e);
             }

             juice.event.subscribe(undefined,
                                   "juice.rpc_failure",
                                   function(event) {
                                       juice.error.raise("backend failure: "+juice.dump(event));
                                   });
             juice.rpc.start();
         };

         return that;
     };

     juice.page = {

         //
         // Defines a juice-managed page. Every page defined using this
         // function will be compiled into an actual html document.
         //

         define: function(spec) {
             spec = juice.spec(spec,
                               {init_widgets: undefined,
                                layout: undefined,
                                name: undefined,
                                parameters: {},
                                base: site.settings.base_url,
                                path: undefined,
                                script_urls: [],
                                stylesheet_urls: [],
                                title: undefined,
                                widget_packages: []
                               });

             if (site.pages.hasOwnProperty(spec.name)) {
                 juice.error.raise("duplicate page name: " + spec.name);
             }
             site.pages[spec.name] = create_page(spec);
         },

         //
         // Defines a page that is not managed by the juice framework. Pages
         // defined in this way are not compiled into html documents.
         //

         define_external: function(spec) {
             spec = juice.spec(spec,
                               {name: undefined,
                                parameters: {},
                                base: site.settings.base_url,
                                path: undefined
                               });

             if (site.pages.hasOwnProperty(spec.name)) {
                 juice.error.raise("duplicate page name: " + spec.name);
             }
             spec.external = true;
             site.pages[spec.name] = create_page(spec);
         },

         //
         // Inserts a widget into the specified panel of the currently active
         // page. Will throw an exception if no page has been initialized.
         //

         add_widget: function(panel, widget) {
             if (!active_layout) {
                 juice.error.raise("add_widget failed: page not initialized");
             }
             active_layout.add_widget(panel, widget);
         },

         init: function(name, selector) {
             constructor(juice, site, jQuery);
             active_page = site.pages[name];
             active_page.init(jQuery(selector));
         },

         set_init: function(constr) {
             constructor = constr;
         },

         current: function() {
             return active_page;
         }
     };

 })(juice, site);
