//
// TODO: document configuration/compilation/etc. data structures.
//

(function(juice) {

     var config = {},
     config_filename = '.juice-config.json',
     log_filename    = '.juice-file-log.json',
     site_settings   = {};

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
         site_settings = juice.spec(s, {base_url: undefined,
                                        cookie_name: undefined,
                                        global_script_urls: [],
                                        global_stylesheet_urls: [],
                                        global_widget_packages: [],
                                        js_base_url: undefined,
                                        smother_alerts: false,
                                        user: {}});
     };

     juice.build.site_settings = function() {
         return site_settings;
     };
     juice.build.set_lib_paths = function(p) {
         config.lib_paths = p;
     };
     juice.build.set_site_settings_path = function(p) {
         config.site_settings_path = p;
     };
     juice.build.site_settings_path = function() {
         return config.site_settings_path;
     };
     juice.build.lib_paths = function() {
         return config.lib_paths;
     };
     juice.build.save_config = function() {
         juice.sys.write_file(config_filename, JSON.stringify(config), true);
     };
     juice.build.load_config = function() {
         config = juice.build.read_file_json(config_filename);
         juice.build.eval_file(config.site_settings_path);
     };

     juice.build.source_file = function(spec) {
         return juice.spec(spec,
                           {category: null,
                            lib_name: null,
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

                           source_files.push(juice.build.source_file({category: "meta",
                                                                      lib_name: lib_name,
                                                                      path: package_json_path,
                                                                      pkg_name: pkg_name,
                                                                      target_type: "widgets"}));

                           // Tag each .js file with the "widgets"
                           // target type.
                           juice.foreach(juice.sys.list_dir(widget_pkg_path, {filter_re: /[.]js$/,
                                                                              fullpath: true}),
                                         function(path) {
                                             source_files.push(
                                                 juice.build.source_file({category: "widget",
                                                                          lib_name: lib_name,
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
                                                     juice.build.source_file({category: 'template',
                                                                              lib_name: lib_name,
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
         source_files = [];

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

     (function() {
          var file_log = function(source_files, log_filename) {



          };

          juice.build.user_file_log = function(source_files) {



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
      })();

     (function() {
          var appliers = [], categorizers = [], user_source_files = [];

          juice.build.categorize_source_files = function(what, categorizer_fn) {
              var path;
              if (what.lib_name) {
                  try {
                      path = juice.build.find_library(what.lib_name);
                  }
                  catch (e) {
                      juice.error.raise("Attempting to set categorizer for unrecognized library: " +lib_name);
                  }
                  path += '/' + what.dir;
              }
              else {
                  path = './' + what.dir;
              }
              categorizers.push({path:path, fn:categorizer_fn, lib_name:what.lib_name});
          };

          juice.build.find_user_categorized_source_files = function() {

              juice.foreach(categorizers,
                            function(categorizer) {
                                var helper = function(path) {
                                    juice.foreach(juice.sys.list_dir(path, {fullpath:true}),
                                                  function(filename) {
                                                      var category;
                                                      if (juice.sys.file_exists(filename) == 'dir') {
                                                          helper(filename);
                                                      }
                                                      else if ((category = categorizer.fn(filename))) {
                                                          user_source_files.push(juice.build.source_file(
                                                                                     {category: category,
                                                                                      lib_name: categorizer.lib_name,
                                                                                      path: filename,
                                                                                      target_type: 'user'}));
                                                      }
                                                  });
                                };
                                helper(categorizer.path);
                            });
              return user_source_files;
          };

          juice.build.apply_to_source_files = function(fn) {
              appliers.push(fn);
          };

          juice.build.run_user_source_file_appliers = function() {
              juice.foreach(appliers,
                            function(applier) {
                                applier(user_source_files);
                            });
          };

      })();

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
         return '(function(juice, site, jQuery) {'
             + contents + '})(juice, site, jQuery);';
     };

     juice.build.read_file_and_scope_js = function(filename) {
         return juice.build.scope_js(juice.sys.read_file(filename));
     };

     juice.build.compile_template_file = function(filename, options) {
         var contents, macros, parser;
         options = juice.spec(options, {macros: null,
                                        templates_prefix: null});

         macros = options.macros || juice.build.read_file_json("macros.json");
         parser = juice.template.parser(macros);

         // Eliminate surrounding whitespace
         contents = juice.sys.read_file(filename).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
         return parser.parse_src(contents, options.templates_prefix);
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
         templates = {};
         juice.foreach(template_filenames,
                       function(source_filename) {
                           var contents, template_name = get_template_name(source_filename);
                           try {
                               // Get rid of surrounding whitespace (e.g., trailing new lines).
                               templates['_' + template_name] =
                                   juice.build.compile_template_file(source_filename,
                                                                     {macros: macros,
                                                                      templates_prefix: 'templates._'});
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
         var files, templates, lines = [];
         files = juice.filter(all_files,
                              function(source_file) {
                                  return source_file.target_type === "juice_web";
                              });

         files = juice.group_by(files, function(file) { return file.category; });

         templates = juice.build.compile_templates(
             juice.map(files.template,
                       function(source_file) {
                           return source_file.path;
                       }));

         lines.push('(function(jQuery) {', 'var templates = ' + templates + ";");
         lines = lines.concat(juice.map(files.js,
                                        function(source) {
                                            return juice.sys.read_file(source.path);
                                        }));
         lines.push('})(jQuery);');
         juice.build.write_final_file(
             'js/juice-web.js',
                 lines.join("\n"));
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
         var base,
         base_source_files,
         lib_util_map,
         pages,
         runtime_settings;

         base_source_files = juice.filter(all_files,
                                          function(file) {
                                              return file.target_type === "base";
                                          });

         base_source_files = juice.group_by(base_source_files,
                                            function(file) {
                                                return file.category;
                                            });

         // Sort by library name first (undefined last) and then by path name
         base_source_files.normal.sort(function(a, b) {
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

         base = juice.map(base_source_files.normal,
                          function(source) {
                              return juice.build.read_file_and_scope_js(source.path);
                          });

         juice.foreach(juice.build.lib_paths(),
                       function(lib_name) {
                           base.push('juice.init_library(site, "' + lib_name + '");');
                       });

         // Build a dictionary that maps each library name to its
         // list of utility source files.

         lib_util_map = {};
         juice.foreach(base_source_files.util,
                       function(source) {
                           juice.mdef(lib_util_map, [], source.lib_name);
                           lib_util_map[source.lib_name].push(source);
                       });

         // Individually package each library's utility source
         // files, then append them to base.

         juice.foreach(lib_util_map,
                       function(lib_name, source_files) {
                           var util = juice.map(source_files,
                                                function(source) {
                                                    return juice.build.read_file_and_scope_js(source.path);
                                                });
                           base = base.concat(
                               ['juice.util.define_package("' + lib_name + '", function(juice, site, jQuery) {',
                                'try {',
                                util.join('\n'),
                                '} catch (e) { juice.error.handle(e); }',
                                '});']);

                       });

         // base
         pages = juice.build.read_file_and_scope_js(base_source_files.pages[0].path);
         base = base.concat(
             ["juice.page.set_init(function(juice, site, jQuery) {",
              "try {",
              pages,
              '} catch (e) { juice.error.handle(e); }',
              '});']);

         runtime_settings = juice.dict_intersect_keys(site_settings,
                                                      ['base_url', 'cookie_name', 'user', 'smother_alerts']);

         // Since settings are prerequisite for many things, make sure they're set first.
         base.unshift('site.settings=' + JSON.stringify(runtime_settings) + ';');

         juice.build.write_final_file(
             'js/base.js',
             base.join("\n"));
     };

     juice.build.lint_page_paths = function(pages_filename) {
         var seen = {};
         load(pages_filename);

         juice.foreach(site.pages,
                       function(name, page) {
                           if (!page.path_is_dynamic()) {
                               if (seen.hasOwnProperty(page.path())) {
                                   juice.build.fatal("Duplicate page path: " + page.path());
                               }
                               seen[page.path()] = true;
                           }
                       });
     };


     juice.build.compile_pages = function(pages_filename) {
         // Ensure page paths are unique
         var page_template;
         load(pages_filename);

         page_template = eval(juice.build.compile_template_file(juice.home() + '/build/templates/page.html'));
         juice.foreach(site.pages,
                       function(name, page) {
                           var dependencies, path;
                           if (page.path_is_dynamic()) {
                               path = '/__' + name + '.html';
                           }
                           else {
                               path = page.path();
                           }
                           if (path.charAt(path.length - 1) === '/') {
                               path += 'index.html';
                           }

                           dependencies =
                               juice.build.collect_page_dependencies(
                                   juice.union(page.widget_packages(),
                                               juice.build.site_settings().global_widget_packages));

                           dependencies.script_urls =
                               juice.union(
                                   dependencies.script_urls,
                                   page.script_urls(),
                                   juice.build.site_settings().global_script_urls);

                           dependencies.stylesheet_urls =
                                       juice.union(
                                           dependencies.stylesheet_urls,
                                           page.stylesheet_urls(),
                                           juice.build.site_settings().global_stylesheet_urls);

                           juice.build.write_final_file(
                               path,
                               page_template({name: name,
                                              title: page.title(),
                                              js_base_url: juice.build.site_settings().js_base_url,
                                              script_urls: dependencies.script_urls,
                                              stylesheet_urls: dependencies.stylesheet_urls,
                                              widget_packages: dependencies.widget_pkgs,
                                              rpc_packages: dependencies.rpc_pkgs}));

                       });
     };

     juice.build.compile_widget_package = function(lib_name, pkg_name, all_source_files) {
         var source_files, templates, widgets;

         // These three loops can be optimized into a single loop if required
         source_files = juice.filter(all_source_files,
                                     function(file) {
                                         return file.lib_name === lib_name
                                             && file.pkg_name === pkg_name
                                             && file.target_type === "widgets";
                                        });

         source_files = juice.group_by(source_files,
                                       function(file) {
                                           return file.category;
                                       });

         widgets = juice.map(source_files.widget,
                             function(source_file) {
                                 return juice.build.read_file_and_scope_js(source_file.path);
                             });

         templates = juice.build.compile_templates(
             juice.map(source_files.template,
                       function(source_file) {
                           return source_file.path;
                       }));

         juice.build.write_final_file(
             'js/libs/' + lib_name + '/widgets/' + pkg_name + '.js',
             ['juice.widget.define_package("' + lib_name + '", "' + pkg_name + '", function(juice, site, jQuery) {',
              'try {',
              'var templates = ' + templates + ';',
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
             ['juice.rpc.define_package("' + lib_name + '", "' + pkg_name + '", function(juice, site, jQuery) {',
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

     juice.build.eval_file = function(filename) {
         // Why does this function exist? Because if you call load
         // in a function scope, locals will not escape!
         load(filename);
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

     juice.build.dependency_map = function(widget_pkg_names) {
         var dependency_map = {};
         juice.foreach(widget_pkg_names,
                       function(widget_pkg_name) {
                           var lib_name, type, pkg_name, parts = widget_pkg_name.split('.');
                           lib_name = parts[0];
                           type = parts[1];
                           pkg_name = parts[2];
                           juice.mdef(dependency_map, [], lib_name, type);
                           dependency_map[lib_name][type].push(pkg_name);
                       });
         return dependency_map;
     };


     // Tell me everything that I need to include on page
     // unexplored is a list of dependency strings (e.g., juice_bar.widgets.demo)

     // {juice_bar: {widgets: [pkg1, pkg2], rpcs: [pkg1, pkg2]}}

     juice.build.collect_page_dependencies = function(widget_pkg_names) {
         var
         helper,
         seen = {},
         rpc_pkgs = [],
         script_urls = [],
         stylesheet_urls = [],
         widget_pkgs = [];

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

         helper(juice.build.dependency_map(widget_pkg_names));

         return {widget_pkgs: widget_pkgs,
                 rpc_pkgs: rpc_pkgs,
                 script_urls: juice.unique(script_urls),
                 stylesheet_urls: juice.unique(stylesheet_urls)};
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
