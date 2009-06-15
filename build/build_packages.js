(function(juice) {
     var find_rpc_packages, find_widget_packages;

     // Each widget package is represented by a set of javascript source files
     // under [lib_path]/lib/widgets/[pkg_name]/, with html template source
     // files under [lib_path]/lib/widgets/[pkg_name]/templates/.

     find_widget_packages = function(lib_name) {
         var base_path, packages = [];
         base_path = juice.path_join(juice.build.find_library(lib_name), "widgets");
         juice.foreach(juice.sys.list_dir(base_path, {fullpath:true}),
                       function(filepath) {
                           if (juice.sys.file_exists(filepath) == "dir") {
                               packages.push({name: juice.sys.basename(filepath),
                                              path: filepath});
                           }
                       });
         return packages;
     };

     // Each rpc package is represented by a single source file at
     // [lib_path]/lib/rpcs/[pkg_name].js, with an optional source file
     // containing mocking code at [lib_path]/lib/rpcs/mock/[pkg_name].js.

     find_rpc_packages = function(lib_name) {
         var base_path, packages = [];
         base_path = juice.path_join(juice.build.find_library(lib_name), "rpcs");
         juice.foreach(juice.sys.list_dir(base_path, {fullpath:true}),
                       function(path) {
                           if (juice.sys.file_exists(path) == "file") {
                               packages.push({name: juice.sys.parse_path(path).without_ext,
                                              path: path});
                           }
                       });
         return packages;
     };

     juice.build.find_widget_source_files = function(lib_name) {
         var source_files = [];

         juice.foreach(find_widget_packages(lib_name, "widgets"),
                       function(pkg) {
                           var package_json_path, templates_path;

                           package_json_path = juice.path_join(pkg.path, "package.json"),
                           templates_path    = juice.path_join(pkg.path, "templates");

                           // Ensure that the package.json file
                           // exists and tag it with the "widgets"
                           // target type.
                           if (juice.sys.file_exists(package_json_path) != "file") {
                               juice.build.fatal("Missing required package file: " + package_json_path);
                           }

                           source_files.push(juice.build.source_file({category: "meta",
                                                                      lib_name: lib_name,
                                                                      path: package_json_path,
                                                                      pkg_name: pkg.name,
                                                                      target_type: "widgets"}));

                           // Tag each .js file with the "widgets"
                           // target type.
                           juice.foreach(juice.sys.list_dir(pkg.path, {filter_re: /[.]js$/,
                                                                       fullpath: true}),
                                         function(path) {
                                             source_files.push(
                                                 juice.build.source_file({category: "widget",
                                                                          lib_name: lib_name,
                                                                          path: path,
                                                                          pkg_name: pkg.name,
                                                                          target_type: "widgets"}));
                                         });

                           // Look in the templates directory and
                           // tag each .html file with the
                           // "widgets" target type
                           if (juice.sys.file_exists(templates_path)) {
                               juice.foreach(juice.sys.list_dir(templates_path,
                                                                {filter_re: /[.]html$/,
                                                                 fullpath: true}),
                                             function(path) {
                                                 source_files.push(
                                                     juice.build.source_file({category: 'template',
                                                                              lib_name: lib_name,
                                                                              path: path,
                                                                              pkg_name: pkg.name,
                                                                              target_type: "widgets"}));
                                             });
                           }
                       });
         return source_files;
     };

     juice.build.find_rpc_source_files = function(lib_name) {
         var source_files = [];

         juice.foreach(find_rpc_packages(lib_name),
                       function(pkg) {
                           var mock_path, paths = [pkg.path], parsed_path;

                           // If rpc mocking is enabled and the mock source file exists, add it too.
                           parsed_path = juice.sys.parse_path(pkg.path);
                           mock_path = juice.path_join(parsed_path.dir, "mock", parsed_path.filename);
                           if (juice.build.config.rpc_mocking() && juice.sys.file_exists(mock_path) == "file") {
                               paths.push(mock_path);
                           }

                           juice.foreach(paths,
                                         function(path) {
                                             source_files.push(
                                                 juice.build.source_file({lib_name: lib_name,
                                                                          path: path,
                                                                          pkg_name: pkg.name,
                                                                          target_type: "rpcs"}));
                                         });
                       });

         return source_files;
     };

     juice.build.library_stubs = function(lib_name) {
         var lib = {
             enhancers: {},
             rpcs:      {},
             util:      {},
             widgets:   {}
         };

         juice.foreach(find_widget_packages(lib_name),
                       function(pkg) {
                           lib.widgets[pkg.name] = {};
                       });

         juice.foreach(find_rpc_packages(lib_name),
                       function(pkg) {
                           lib.rpcs[pkg.name] = {};
                       });

         return lib;
     };

     juice.build.all_library_stubs = function() {
         var answer = {};
         juice.foreach(juice.build.config.lib_paths(),
                       function(lib_name) {
                           answer[lib_name] = juice.build.library_stubs(lib_name);
                       });
         return answer;
     };

     // Write the JSONified output of juice.build.all_library_stubs() to a
     // hidden source file, tag it with the "base" target, and return it. This
     // allows the compiler to force the base target to be recompiled whenever
     // a package is added to or removed from a library.

     juice.build.make_all_library_stubs_source_file = function() {
         var filename =  ".juice-all-library-stubs.json";
         juice.sys.write_file(filename, JSON.stringify(juice.build.all_library_stubs()), true);
         return juice.build.source_file({target_type: "base", path: filename, category: "build"});
     };

     juice.build.compile_widget_package = function(lib_name, pkg_name, all_source_files) {
         var source_files, templates, widgets;

         source_files = juice.filter(all_source_files["widgets"],
                                     function(file) {
                                         return file.lib_name === lib_name
                                             && file.pkg_name === pkg_name;
                                        });

         source_files = juice.group_by(source_files,
                                       function(file) {
                                           return file.category;
                                       });

         widgets = juice.map(source_files.widget,
                             function(source_file) {
                                 return juice.sys.read_file(source_file.path);
                             });

         templates = juice.build.compile_templates(
             juice.map(source_files.template,
                       function(source_file) {
                           return source_file.path;
                       }));

         juice.build.write_target_file(
             juice.path_join('js/libs', lib_name, 'widgets', pkg_name) + '.js',
             ['juice.widget.define_package("' + lib_name + '", "' + pkg_name + '", function(juice, site, jQuery) {',
              'var templates = ' + templates + ';',
              widgets.join('\n'),
              '});'].join("\n"));
     };

     juice.build.compile_rpc_package = function(lib_name, pkg_name, all_source_files) {
         var source_files, rpcs;

         source_files = juice.filter(all_source_files["rpcs"],
                                     function(source_file) {
                                         return source_file.lib_name === lib_name
                                             && source_file.pkg_name === pkg_name;
                                     });

         rpcs = juice.map(source_files,
                          function(source_file) {
                              return juice.build.read_file_and_scope_js(source_file.path);
                          });

         juice.build.write_target_file(
             juice.path_join('js/libs', lib_name, 'rpcs', pkg_name) + '.js',
             ['juice.rpc.define_package("' + lib_name + '", "' + pkg_name + '", function(juice, site, jQuery) {',
              rpcs.join('\n'),
              '});'].join("\n"));
     };

 })(juice);
