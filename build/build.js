//
// TODO: document configuration/compilation/etc. data structures.
//

(function(juice) {

     var config = {},
     config_filename = '.juice-config.json',
     log_filename    = '.juice-file-log.json';

     juice.build = {};

     juice.build.fatal = function(msg) {
         // TODO: possibly reformat msg when it's too long.
         print('Fatal: ' + msg);
         print('\nCompilation aborted.');
         juice.sys.exit(2);
     };

     juice.build.clean = function() {
         juice.sys.unlink(log_filename);
         juice.sys.rm_rf('./build');
     };

     juice.build.set_site_settings = function(s) {
         config.site_settings = juice.spec(s, {base_url: undefined,
                                               js_base_url: undefined,
                                               global_script_urls: [],
                                               global_stylesheet_urls: [],
                                               global_widget_packages: [],
                                               user: {}});
     };
     juice.build.site_settings = function() {
         return config.site_settings;
     };
     juice.build.set_lib_paths = function(p) {
         config.lib_paths = p;
     };
     juice.build.lib_paths = function() {
         return config.lib_paths;
     };
     juice.build.save_config = function() {
         juice.sys.write_file(config_filename, JSON.stringify(config), true);
     };
     juice.build.load_config = function() {
         config = juice.build.read_file_json(config_filename);
     };

     juice.build.source_file = function(spec) {
         return juice.spec(spec,
                           {lib_name: null,
                            path: undefined,
                            pkg_name: null,
                            target_type: undefined});
     };

     juice.build.find_widget_source_files = function(lib_name) {
         var widgets_path = juice.build.find_library(lib_name) + "/widgets/",
         pkgs,
         source_files = [];

         // Each sub-directory contains a widget package.
         pkgs = juice.filter(juice.sys.list_dir(widgets_path),
                             function(pkg) {
                                 return juice.sys.file_exists(widgets_path + pkg) === "dir";
                             });

         juice.foreach(pkgs,
                       function(pkg_name) {
                           var widget_pkg_path = widgets_path + pkg_name,
                           package_json_path   = widget_pkg_path + "/package.json",
                           templates_path      = widget_pkg_path + "/templates/";

                           // Ensure that the package.json file
                           // exists and tag it with the "widgets"
                           // target type.
                           if (juice.sys.file_exists(package_json_path) != "file") {
                               juice.build.fatal("Missing required package file: "
                                                 + package_json_path);
                           }

                           source_files.push(juice.build.source_file({lib_name: lib_name,
                                                                      path: package_json_path,
                                                                      pkg_name: pkg_name,
                                                                      target_type: "widgets"}));

                           // Tag each .js file with the "widgets"
                           // target type.
                           juice.foreach(juice.sys.list_dir(widget_pkg_path, {filter_re: /[.]js$/,
                                                                              fullpath: true}),
                                         function(path) {
                                             source_files.push(
                                                 juice.build.source_file({lib_name: lib_name,
                                                                          path: path,
                                                                          pkg_name: pkg_name,
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
                                                     juice.build.source_file({lib_name: lib_name,
                                                                              path: path,
                                                                              pkg_name: pkg_name,
                                                                              target_type: "widgets"}));
                                             });
                           }
                       });
         return source_files;
     };

     juice.build.find_rpc_source_files = function(lib_name) {
         var rpcs_path = juice.build.find_library(lib_name) + "/rpcs/",
         pkgs,
         proxies_path = rpcs_path + "proxies.js",
         source_files = [];

         // Look within the rpc directory for the proxies.js file
         // and tag it with type "base".
         if (juice.sys.file_exists(proxies_path) != "file") {
             juice.build.fatal("Missing required proxies file: " + proxies_path);
         }
         source_files.push(
             juice.build.source_file({lib_name: lib_name,
                                      path: proxies_path,
                                      target_type: "base"}));

         pkgs = juice.filter(juice.sys.list_dir(rpcs_path),
                             function(pkg) {
                                 return juice.sys.file_exists(rpcs_path + pkg) === "dir";
                             });

         juice.foreach(pkgs,
                       function(pkg_name) {
                           // Tag each .js file with the "rpcs" target type.
                           juice.foreach(juice.sys.list_dir(rpcs_path + pkg_name,
                                                            {filter_re: /[.]js$/,
                                                             fullpath: true}),
                                         function(path) {
                                             source_files.push(
                                                 juice.build.source_file({lib_name: lib_name,
                                                                          path: path,
                                                                          pkg_name: pkg_name,
                                                                          target_type: "rpcs"}));
                                         });
                       });

         return source_files;
     };


     juice.build.find_util_source_files = function(lib_name) {
         var util_path = juice.build.find_library(lib_name) + "/util/";
         if (!juice.sys.file_exists(util_path)) {
             return [];
         }

         // Tag each .js file with the "base" target type.
         return juice.map(juice.sys.list_dir(util_path,
                                             {filter_re: /[.]js$/,
                                              fullpath: true}),
                          function(path) {
                              return juice.build.source_file({lib_name: lib_name,
                                                              path: path,
                                                              pkg_name: pkg_name,
                                                              target_type: "base"});
                          });
     };

     juice.build.file_log = function(source_files) {
         var cache = {}, log, sha1_file;

         if (juice.sys.file_exists(log_filename)) {
             log = juice.dict_intersect_keys(juice.build.read_file_json(log_filename),
                                             juice.map(source_files, function(f) { return f.path; }));
         }
         else {
             log = {};
         }

         sha1_file = function(filename) {
             if (!cache[filename]) {
                 cache[filename] = juice.sys.sha1(juice.sys.read_file(filename));
             }
             return cache[filename];
         };

         return {
             has_file_changed: function(filename) {
                 return sha1_file(filename) !== log[filename];
             },
             update_file: function(filename) {
                 log[filename] = sha1_file(filename);
             },
             save: function() {
                 juice.sys.write_file(log_filename, JSON.stringify(log), true);
             },
             clear: function() {
                 juice.sys.unlink(log_filename);
                 log = {};
             }
         };
     };

     juice.build.file_find = function(top_dir, predicate) {
         var answer = [], helper;
         helper = function(path) {
             juice.foreach(juice.sys.list_dir(path, {fullpath:true}),
                           function(filename) {
                               if (juice.sys.file_exists(filename) == 'dir') {
                                   helper(filename);
                               }
                               else if (!predicate || predicate(filename)) {
                                   answer.push(filename);
                               }
                           });
         };
         helper(top_dir);
         return juice.map(answer, function(f) { return f.slice(top_dir.length + 1); });
     };

     juice.build.lint_js = function(filename) {
         var arrow = function(column) {
             var a = [], j;
             for (j = 0; j < column; j++) {
                 a.push('.');
             }
             a.push('^');
             return a.join('');
         };

         if (!JSLINT(juice.sys.read_file(filename),
                     {evil: true,
                      forin: true,
                      laxbreak: true,
                      rhino: false,
                      white: false}))
         {
             // For some reason JSLINT.errors contains null values
             return juice.map(juice.filter(JSLINT.errors),
                              function(e) {
                                  return '"' + e.reason + '" in file ' + filename + ' at line '
                                      + (e.line + 1) + ' character ' + e.character + "\n"
                                      + e.evidence + "\n" + arrow(e.character) + "\n\n";
                              });
         }
         return [];
     };

     juice.build.final_file_path = function(relpath) {
         return 'build/final/' + relpath; // FIXME: add site name and mode (e.g. "bp/release")
     };
     juice.build.intermediate_file_path = function(relpath) {
         return 'build/intermediate/' + relpath;
     };
     juice.build.write_final_file = function(relpath, contents) {
         juice.sys.write_file(juice.build.final_file_path(relpath), contents, true);
     };
     juice.build.write_intermediate_file = function(relpath, contents) {
         juice.sys.write_file(juice.build.intermediate_file_path(relpath), contents, true);
     };

     juice.build.scope_js = function(contents) {
         return '(function(juice, proj, jQuery) {'
             + contents + '})(juice, proj, jQuery);';
     };

     juice.build.read_file_and_scope_js = function(filename) {
         return juice.build.scope_js(juice.sys.read_file(filename));
     };

     juice.build.compile_templates = function(template_filenames) {
         var
         context_var_name,
         get_template_name,
         macros,
         parser,
         templates;

         get_template_name = function(filename) {
             return juice.sys.basename(filename).replace('.html', '');
         };

         macros = juice.build.read_file_json("macros.json");
         parser = juice.template.parser(macros);
         templates = {};
         juice.foreach(template_filenames,
                       function(source_filename) {
                           var contents, template_name;
                           template_name = get_template_name(source_filename);
                           try {
                               // Get rid of surrounding whitespace (e.g., trailing new lines).
                               contents =
                                   juice.sys.read_file(source_filename).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                               templates['_' + template_name] = parser.parse_src(contents, 'templates._');
                               templates[template_name] =
                                   'function(_o) { return function() { return templates._' + template_name + '(_o); }; }';
                           }
                           catch (e) {
                               if (e.info && e.info.what === 'syntax_error') {
                                   juice.error.raise(
                                       juice.template.formatted_error(e,
                                                                      file_contents,
                                                                      juice.sys.canonical_path(source_filename)));
                               }
                               else {
                                   throw e;
                               }
                           }
                       });

         return "{" +
             juice.map_dict(templates,
                            function(template_name, template_src) {
                                return '"' + template_name + '":' + template_src;
                            }).join(",") + "}";
     };

     juice.build.compile_juice_web = function(all_files) {
         var files = juice.filter(all_files,
                                  function(source_file) {
                                      return source_file.target_type === "juice_web";
                                  });
         juice.build.write_final_file(
             'js/juice-web.js',
             juice.map(files,
                       function(source) {
                           return juice.sys.read_file(source.path);
                       }).join("\n"));
     };

     juice.build.compile_juice_ext_web = function(all_files) {
         var files = juice.filter(all_files,
                                  function(source_file) {
                                      return source_file.target_type === "juice_ext_web";
                                  });

         juice.build.write_final_file(
             'js/juice-ext.js',
             juice.map(files,
                       function(source) {
                           return juice.sys.read_file(source.path);
                       }).join("\n"));
     };


     juice.build.compile_site_base = function(all_files) {
         var base, base_source_files, runtime_settings;

         base_source_files = juice.filter(all_files,
                                          function(source_file) {
                                              return source_file.target_type === "base";
                                          });

         // Sort by library name first (undefined last) and then by path name
         base_source_files.sort(function(a, b) {
                                    if (a.library_name < b.library_name) {
                                        return -1;
                                    }
                                    if (a.library_name > b.library_name) {
                                        return 1;
                                    }
                                    if (a.path < b.path) {
                                        return -1;
                                    }
                                    if (a.path > b.path) {
                                        return 1;
                                    }
                                    return 0;
                                });

         base = juice.map(base_source_files,
                          function(source) {
                              return juice.build.read_file_and_scope_js(source.path);
                          });

         runtime_settings = juice.dict_intersect_keys(config.site_settings, ['base_url', 'user']);
         base.push('juice.install_settings(' + JSON.stringify(runtime_settings) + ');');

         juice.build.write_final_file(
             'js/base.js',
             base.join("\n"));
     };

     juice.build.compile_widget_package = function(lib_name, pkg_name, all_source_files) {
         var js_source_files, template_source_files, source_files, widgets;

         // These three loops can be optimized into a single loop if required
         source_files = juice.filter(all_source_files,
                                     function(source_file) {
                                         return source_file.lib_name === lib_name
                                             && source_file.pkg_name === pkg_name
                                             && source_file.target_type === "widgets";
                                        });

         js_source_files = juice.filter(source_files,
                                        function(source_file) {
                                            return source_file.path.slice(-3) === ".js";
                                        });

         // FOR NOW WE RECOMPILE ALL TEMPLATES
         template_source_files = juice.filter(source_files,
                                              function(source_file) {
                                                  return source_file.path.slice(-5) == ".html";
                                              });

         widgets = juice.map(js_source_files,
                             function(source_file) {
                                 return juice.build.read_file_and_scope_js(source_file.path);
                             });

         var templates = juice.build.compile_templates(
             juice.map(template_source_files,
                       function(source_file) {
                           return source_file.path;
                       }));

         juice.build.write_final_file(
             'js/libs/' + lib_name + '/widgets/' + pkg_name + '.js',
             ['juice.widget.define_package("' + pkg_name + '", function(juice, jQuery) {',
              'try {',
              'var templates = ' + templates,
              widgets.join('\n'),
              '} catch (e) { juice.error.handle(e); }',
              '});'].join("\n"));
     };

     juice.build.compile_rpc_package = function(lib_name, pkg_name, all_source_files) {
         var source_files, rpcs;

         source_files = juice.filter(all_source_files,
                                     function(source_file) {
                                         return source_file.lib_name === lib_name
                                             && source_file.pkg_name === pkg_name
                                             && source_file.target_type === "rpcs";
                                     });

         rpcs = juice.map(source_files,
                          function(source_file) {
                              return juice.build.read_file_and_scope_js(source_file.path);
                          });

         juice.build.write_final_file(
             'js/libs/' + lib_name + '/rpcs/' + pkg_name + '.js',
             ['juice.rpc.define_package("' + pkg_name + '", function(juice) {',
              'try {',
              rpcs.join('\n'),
              '} catch (e) { juice.error.handle(e); }',
              '});'].join("\n"));
     };

     juice.build.find_library = function(name) {
         var path = config.lib_paths[name];
         if (path) { return path; }
         return juice.error.raise('path to library "'+name+'" is unknown');
     };

     juice.build.read_file_json = function(filename) {
         var answer;
         eval('answer = ' + juice.sys.read_file(filename));
         return answer;
     };

     juice.build.lib_name = function(path) {
         var json, lib_json_path;
         lib_json_path = path + '/lib.json';
         if (juice.sys.file_exists(lib_json_path) !== 'file') {
             return false;
         }
         json = juice.build.read_file_json(lib_json_path);
         return json.hasOwnProperty('name') ? json.name : undefined;
     };

     juice.build.lib_exists = function(name, path) {
         return juice.build.lib_name(path) === name;
     };

     juice.build.read_widget_package_metadata = function(libpath, pkg) {
         var answer, json, pkg_filename;

         pkg_filename = libpath + '/widgets/' + pkg + '/package.json';
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

     juice.build.library_dependencies = function(libpath) {
         var answer = {};

         juice.foreach(juice.sys.list_dir(libpath + '/widgets/'),
                       function(pkg) {
                           var metadata = juice.build.read_widget_package_metadata(libpath, pkg);
                           answer = juice.build.merge_library_dependencies(answer, metadata.dependencies);
                       });

         return answer;
     };

     juice.build.merge_library_dependencies = function() {
         var answer = {}, helper;

         helper = function(deps) {
             juice.foreach(deps,
                           function(libname, libdeps) {
                               if (!answer.hasOwnProperty(libname)) {
                                   answer[libname] = {widgets: [], rpcs: []};
                               }
                               juice.foreach(libdeps,
                                             function(pkgtype, pkgnames) {
                                                 answer[libname][pkgtype] = answer[libname][pkgtype].concat(pkgnames);
                                             });
                           });
         };

         juice.foreach(juice.args(arguments), helper);

         juice.foreach(answer,
                       function(k, libdeps) {
                           answer[k] = juice.map(libdeps, juice.unique);
                       });

         return answer;
     };

 })(juice);
