(function(juice, site) {

     var
     active_layout,
     constructor,
     create_page,
     dynamic_path_var_re,
     page_404;

     dynamic_path_var_re = /\[\[(\w+) (.*?)\]\]/g;

     create_page = function(spec) {
         var extract_args, my = {}, that = {};
         spec = juice.spec(spec,
                           {init_widgets: undefined,
                            layout: undefined,
                            name: undefined,
                            parameters: [],
                            path: undefined,
                            script_urls: [],
                            stylesheet_urls: [],
                            title: undefined,
                            widget_packages: []
                           });

         // args is optional but must be an object if provided.
         extract_args = function(args) {
             var recognized = {}, missing = [];

             if (juice.is_object(args)) {
                 juice.foreach(spec.parameters,
                               function(k) {
                                   if (args.hasOwnProperty(k)) {
                                       recognized[k] = args[k];
                                   }
                                   else {
                                       missing.push(k);
                                   }
                               });
             }
             else if (!juice.is_undefined(args)) {
                 juice.error.raise('page_args_bad_type', {expected: 'object', actual: typeof args});
             }

             return {recognized: recognized, missing: missing};
         };

         that.title = function() {
             return spec.title;
         };

         that.path = function() {
             return spec.path;
         };

         that.path_is_dynamic = function() {
             return dynamic_path_var_re.test(spec.path);
         };

         that.script_urls = function() {
             return spec.script_urls;
         };

         that.stylesheet_urls = function() {
             return spec.stylesheet_urls;
         };

         that.widget_packages = function() {
             return spec.widget_packages;
         };

         that.url = function(args) {
             var cmp, path, path_args, query_args;

             cmp = extract_args(args);
             if (cmp.missing.length !== 0) {
                 juice.error.raise('missing_parameters', {page_name: name, parameters: cmp.missing});
             }

             path = spec.path;
             path_args = {};
             juice.foreach(cmp.recognized,
                          function(k, v) {
                              var match, re;
                              re = new RegExp('\\[\\[' + k + ' (.*?)\\]\\]');
                              for (;;) {
                                  match = re.exec(path);
                                  if (!match) {
                                      break;
                                  }
                                  if (!((new RegExp(match[1])).test(v))) {
                                      juice.error.raise('argument_pattern_mismatch', {argument: v, pattern: match[1]});
                                  }
                                  path = path.replace(match[0], v);
                                  path_args[k] = true;
                              }
                          });

             query_args = juice.filter(cmp.recognized, function(k, v) { return !path_args[k]; });
             return juice.url.make({path: path, args: query_args});
         };

         // If this page's URL matches the request, returns the dictionary of
         // parameters expected by the page. Otherwise, returns null.

         that.match_url = function(req) {
             var
             args = {},
             keys_re,       // matches dynamic path variable names
             vals_re,       // matches dynamic path variable values
             keys,          // dynamic path variable names
             cmp,
             dynamic_path_args,
             match_result;

             juice.foreach(req.args, function(k,v) { args[k] = v; });

             if (that.path_is_dynamic()) {
                 vals_re = new RegExp('^' + spec.path.replace(dynamic_path_var_re, '($2)') + '$');
                 if (!(match_result = req.path.match(vals_re))) {
                     return null;
                 }
                 keys_re = new RegExp('^' + spec.path.replace(dynamic_path_var_re, '\\[\\[($1).*?\\]\\]') + '$');
                 keys = spec.path.match(keys_re).slice(1);
                 dynamic_path_args = juice.combine(keys, match_result.slice(1));
                 juice.foreach(dynamic_path_args, function(k, v) { args[k] = v; });
             }

             cmp = extract_args(args);
             return cmp.missing.length === 0 ? cmp.recognized : null;
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

         that.init = function(container) {
             var args = that.match_url(juice.url.request());
             if (args) {
                     that.draw(container, args);
                 }
                 else if (page_404) {
                     page_404.draw(container);
                 }
                 else {
                     juice.error.raise('404_page_not_defined');
                 }
                 juice.event.subscribe(undefined,
                                       'service-failure',
                                       function(event) {
                                           juice.util.message.error('Backend failure: ' + juice.dump(event));
                                       });
                 juice.rpc.start();
         };

         return that;
     };

     juice.page = {

         define: function(spec) {
             site.pages[spec.name] = create_page(spec);
         },

         define_404: function(spec) {
             spec.name = '_404';
             page_404 = create_page(spec);
         },

         add_widget: function(panel, widget) {
             if (!active_layout) {
                 juice.error.raise('page_not_initialized');
             }
             active_layout.add_widget(panel, widget);
         },

         init: function(name, selector) {
             constructor(juice, site, jQuery);
             site.pages[name].init(jQuery(selector));
         },

         set_init: function(constr) {
             constructor = constr;
         }
     };

 })(juice, site);
