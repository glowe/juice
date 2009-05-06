(function(juice) {
     var collect_page_dependencies, init, initialized = false;
     init = function(pages_filename) {
         if (initialized) {
             return;
         }
         juice.foreach(juice.build.config.lib_paths(),
                       function(lib_name) {
                           site.lib[lib_name] = juice.build.library_stubs(lib_name);
                       });
         load("layouts.js");
         load("pages.js");
         initialized = true;
     };

     // Tell me everything that I need to include on page
     // unexplored is a list of dependency strings (e.g., juice_bar.widgets.demo)

     // {juice_bar: {widgets: [pkg1, pkg2], rpcs: [pkg1, pkg2]}}

     collect_page_dependencies = function(widget_pkg_names) {
         var
         build_dependency_map,
         helper,
         seen = {},
         rpc_pkgs = [],
         script_urls = [],
         stylesheet_urls = [],
         widget_pkgs = [];

         build_dependency_map = function() {
             var dependency_map = {};
             juice.foreach(widget_pkg_names,
                           function(widget_pkg_name) {
                               var lib_name, type, pkg_name, parts = widget_pkg_name.split('.');
                               if (parts.length != 3) {
                                   juice.error.raise('invalid widget package specification: "'+widget_pkg_name+'"');
                               }
                               lib_name = parts[0];
                               type = parts[1];
                               pkg_name = parts[2];
                               juice.mdef(dependency_map, [], lib_name, type);
                               dependency_map[lib_name][type].push(pkg_name);
                           });
             return dependency_map;
         };


         helper = function(dependencies) {
             juice.foreach(dependencies,
                           function(lib_name, lib) {
                               juice.foreach(lib.widgets,
                                             function(pkg_name) {
                                                 var key, metadata;
                                                 key = lib_name + '.widgets.' + pkg_name;
                                                 if (seen.hasOwnProperty(key)) {
                                                     return;
                                                 }

                                                 widget_pkgs.push({lib_name: lib_name,
                                                                   pkg_name: pkg_name});

                                                 metadata =
                                                     juice.build.read_widget_package_metadata(
                                                         juice.build.find_library(lib_name), pkg_name);

                                                 script_urls = script_urls.concat(metadata.script_urls);
                                                 stylesheet_urls = stylesheet_urls.concat(metadata.stylesheet_urls);

                                                 seen[key] = true;
                                                 helper(metadata.dependencies);
                                             });
                               juice.foreach(lib.rpcs,
                                             function(pkg_name) {
                                                 var key;
                                                 key = lib_name + '.rpcs.' + pkg_name;
                                                 if (seen.hasOwnProperty(key)) {
                                                     return;
                                                 }
                                                 rpc_pkgs.push({lib_name: lib_name,
                                                                pkg_name: pkg_name});
                                                 seen[key] = true;
                                             });
                           });
         };

         helper(build_dependency_map());

         return {widget_pkgs: widget_pkgs,
                 rpc_pkgs: rpc_pkgs,
                 script_urls: juice.unique(script_urls),
                 stylesheet_urls: juice.unique(stylesheet_urls)};
     };


     juice.build.lint_pages = function() {
         var seen = {};

         init();

         // Verify that:
         //
         // (1) No two pages refer to the same path. We have to take it on
         // faith that dynamic paths won't collide.
         //
         // (2) All dynamic parameters (i.e. arguments passed via a page's
         // path) are specified in their page's parameter lists.
         //
         // (3) All dynamic parameters have associated pattern attributes.

         juice.foreach(site.pages,
                       function(name, page) {
                           var fail, key, parameters = page.parameters();
                           fail = function(msg) {
                               juice.build.fatal('in page "'+page.name()+'": '+msg);
                           };
                           if (page.path_is_dynamic()) {
                               juice.foreach(page.path_parameters(),
                                             function(param_name) {
                                                 if (!parameters.hasOwnProperty(param_name)) {
                                                     fail('dynamic parameter "'+param_name+'" not in parameter list');
                                                 }
                                                 if (!parameters[param_name].hasOwnProperty("pattern")) {
                                                     fail('dynamic parameter "'+param_name+'" requires a "pattern" attribute');
                                                 }
                                             });
                           }
                           else {
                               key = page.base() + page.path();
                               if (seen.hasOwnProperty(key)) {
                                   fail('duplicate page path: ' + key);
                               }
                               seen[key] = true;
                           }
                       });
     };

     juice.build.compile_pages = function() {
         var page_template;

         init();

         page_template = juice.build.compile_template(juice.path_join(juice.home(), 'build/templates/page.html'));

         juice.foreach(site.pages,
                       function(name, page) {
                           var dependencies, path, js_base_url = juice.url.make(juice.build.site_settings().js_base_url);

                           if (page.path_is_dynamic()) {
                               path = '/__' + name + '.html';
                           }
                           else {
                               path = page.path();
                           }

                           if (path.slice(-1) === '/') { // FIXME: this is error-prone
                               path += 'index.html';
                           }

                           dependencies =
                               collect_page_dependencies(
                                   juice.unique(page.widget_packages(),
                                                juice.build.site_settings().global_widget_packages));

                           dependencies.script_urls =
                               juice.unique(
                                   juice.map(["juice-ext.js", "juice-web.js", "base.js"],
                                             function(filename) {
                                                 return js_base_url.path_join(
                                                     juice.build.versioned_path(
                                                         juice.path_join("js", filename)));
                                             }),
                                   dependencies.script_urls,
                                   page.script_urls(),
                                   juice.build.site_settings().global_script_urls,
                                   juice.map(dependencies.rpc_pkgs,
                                             function(pkg) {
                                                 return js_base_url.path_join(
                                                     juice.build.versioned_path(
                                                         juice.path_join("js/libs",
                                                                         pkg.lib_name,
                                                                         "rpcs",
                                                                         pkg.pkg_name + ".js")));
                                             }),
                                   juice.map(dependencies.widget_pkgs,
                                             function(pkg) {
                                                 return js_base_url.path_join(
                                                     juice.build.versioned_path(
                                                         juice.path_join("js/libs",
                                                                         pkg.lib_name,
                                                                         "widgets",
                                                                         pkg.pkg_name + ".js")));
                                             }));

                           dependencies.stylesheet_urls =
                               juice.unique(
                                   juice.build.site_settings().global_stylesheet_urls,
                                   dependencies.stylesheet_urls,
                                   page.stylesheet_urls());

                           juice.build.write_target_file(
                               path,
                               page_template({name: name,
                                              title: page.title(),
                                              script_urls: dependencies.script_urls,
                                              stylesheet_urls: dependencies.stylesheet_urls}));

                       });
     };
 })(juice);
