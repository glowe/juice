//
// TODO: document configuration/compilation/etc. data structures.
//

(function(juice) {

     var site_settings = {};

     juice.build = {};

     juice.build.fatal = function(msg) {
         // TODO: possibly reformat msg when it's too long.
         print("FATAL: " + msg);
         juice.sys.exit(2);
     };

     juice.build.set_site_settings = function(s) {
         site_settings = juice.spec(s, {base_url: undefined,
                                        cookie_name: undefined,
                                        global_script_urls: [],
                                        global_stylesheet_urls: [],
                                        global_widget_packages: [],
                                        js_base_url: undefined,
                                        minify: false,
                                        rpc_mocking: true,
                                        smother_alerts: false,
                                        user: {}});
     };

     juice.build.site_settings = function() {
         return site_settings;
     };

     juice.build.source_file = function(spec) {
         return juice.spec(spec,
                           {category: null,
                            lib_name: null,
                            path: undefined,
                            pkg_name: null,
                            target_type: undefined});
     };

     juice.build.read_file_json = function(filename) {
         var answer;
         eval('answer = ' + juice.sys.read_file(filename));
         return answer;
     };

     juice.build.eval_file = function(filename) {
         // Why does this function exist? Because if you call load
         // in a function scope, locals will not escape!
         load(filename);
     };

     juice.build.final_file_path = function(relpath) {
         return juice.path_join('build', 'final', relpath); // FIXME: add site name and mode (e.g. "bp/release")
     };
     juice.build.intermediate_file_path = function(relpath) {
         return juice.path_join('build', 'intermediate', relpath); // FIXME: add site name and mode (e.g. "bp/release")
     };
     juice.build.write_final_file = function(relpath, contents) {
         juice.sys.write_file(juice.build.final_file_path(relpath), contents, true);
     };
     juice.build.write_intermediate_file = function(relpath, contents) {
         juice.sys.write_file(juice.build.intermediate_file_path(relpath), contents, true);
     };

     juice.build.scope_js = function(contents) {
         return '(function(juice, site, jQuery) {' + contents + '})(juice, site, jQuery);';
     };

     juice.build.read_file_and_scope_js = function(filename) {
         return juice.build.scope_js(juice.sys.read_file(filename));
     };

     juice.build.read_widget_package_metadata = function(libpath, pkg) {
         var answer, json, pkg_filename;

         pkg_filename = juice.path_join(libpath, 'widgets', pkg, 'package.json');
         if (juice.sys.file_exists(pkg_filename) != 'file') {
             juice.error.raise('package metadata file not found: '+pkg_filename);
         }
         json = juice.build.read_file_json(pkg_filename);

         answer = {
             dependencies: {},
             stylesheet_urls: juice.nvl(json.stylesheet_urls, []),
             script_urls: juice.nvl(json.script_urls, [])
         };

         // TODO: perform some defensive checks on the package metadata
         juice.foreach(json.dependencies,
                       function(dep) {
                           var
                           library_name,
                           package_name,
                           package_type,
                           parts,
                           target;

                           parts = dep.split('.');
                           library_name = parts[0];
                           package_type = parts[1];
                           package_name = parts[2];

                           if (!answer.dependencies.hasOwnProperty(library_name)) {
                               answer.dependencies[library_name] = {widgets: [], rpcs: []};
                           }
                           answer.dependencies[library_name][package_type].push(package_name);
                       });

         return answer;
     };


     juice.build.find_util_source_files = function(lib_name) {
         var util_path = juice.path_join(juice.build.find_library(lib_name), "util");
         if (!juice.sys.file_exists(util_path)) {
             return [];
         }

         // Tag each .js file with the "util" target type.
         return juice.map(juice.sys.list_dir(util_path,
                                             {filter_re: /[.]js$/,
                                              fullpath: true}),
                          function(path) {
                              return juice.build.source_file({category: "util",
                                                              lib_name: lib_name,
                                                              path: path,
                                                              pkg_name: undefined,
                                                              target_type: "base"});
                          });
     };


     juice.build.minify = function() {
         juice.foreach(juice.sys.list_dir(juice.build.final_file_path("js"), {fullpath: true, filter_re: /[.]js$/}),
                       function(path) {
                           juice.sys.write_file(path, jsmin("", juice.sys.read_file(path), 3), true);
                       });
         juice.foreach(juice.sys.list_dir(juice.build.final_file_path("js/libs"), {fullpath: true}),
                       function(lib_path) {
                           juice.foreach(["rpcs", "widgets"],
                                         function(type) {
                                             juice.foreach(juice.sys.list_dir(juice.path_join(lib_path, type),
                                                                              {fullpath: true, filter_re: /[.]js$/}),
                                                           function(path) {
                                                               juice.sys.write_file(path,
                                                                                    jsmin("", juice.sys.read_file(path), 3),
                                                                                    true);
                                                           });
                                         });
                       });
     };
 })(juice);
