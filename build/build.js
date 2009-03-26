//
// TODO: document configuration/compilation/etc. data structures.
//

(function(juice) {

     var config,
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

     juice.build.save_config = function(c) {
         juice.sys.write_file(config_filename, JSON.stringify(c), true);
     };

     juice.build.load_config = function() {
         config = juice.build.read_file_json(config_filename);
     };

     juice.build.lib_paths = function() {
         // TODO: assert config has been loaded.
         return config.lib_paths;
     };

     juice.build.source_file = function(rel_path, lib_name) {
         var match, path, pkg_name, target_type;

         if (lib_name) {
             path = juice.build.find_library(lib_name) + '/' + rel_path;
         }
         else {
             path = rel_path;
         }

         if ((match = /^(widgets|rpcs)\/([^\/]+)\//.exec(rel_path))) {
             target_type = match[1];
             pkg_name = match[2];
         }
         else if (rel_path === 'pages.js') {
             target_type = 'pages';
         }
         else {
             target_type = 'global';
         }

         return {
             lib_name: lib_name,
             path: path,
             target_type: target_type,
             pkg_name: pkg_name
         };
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
             return juice.map(JSLINT.errors,
                              function(e) {
                                  return '"' + e.reason + '" in file ' + filename + ' at line '
                                      + (e.line + 1) + ' character ' + e.character + "\n"
                                      + e.evidence + "\n" + arrow(e.character) + "\n\n";
                              });
         }
         return [];
     };

     juice.build.write_target_file = function(relpath, contents) {
         juice.sys.write_file('build/target/' + relpath, contents, true); // FIXME: add site name and mode (e.g. "bp/release")
     };

     juice.build.write_intermediate_file = function(relpath, contents) {
         juice.sys.write_file('build/intermediate/' + relpath, contents, true);
     };

     juice.build.scope_js = function(contents) {
         return '(function(juice, proj, jQuery) {'
             + contents + '})(juice, proj, jQuery);';
     };

     juice.build.read_file_and_scope_js = function(filename) {
         return juice.build.scope_js(juice.sys.read_file(filename));
     };

    //  juice.build.compile_templates = function() {
    //      var
    //      context_var_name,
    //      get_canonical_path,
    //      get_template_name,
    //      output,
    //      parser,
    //      templates;

    //      get_template_name = function(filename) {
    //          return juice.sys.basename(filename).replace('.html', '');
    //      };

    //      load(juice.proj_settings.macros_filename());
    //      parser = juice.template.parser(macros);
    //      templates = {};
    //      juice.foreach(settings.args,
    //                    function(source_filename) {
    //                        // Get rid of surrounding whitespace (e.g., trailing new lines).
    //                        var file_contents, template_name;
    //                        template_name = get_template_name(source_filename);
    //                        try {
    //                            file_contents = juice.build.read_file(source_filename).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    //                            templates['_' + template_name] = parser.parse_src(file_contents, 'templates._');
    //                            templates[template_name] = 'function(_o) { return function() { return templates._' + template_name + '(_o); }; }';
    //                        }
    //                        catch (e) {
    //                            if (e.info && e.info.what === 'syntax_error') {

    //                                print(juice.template.formatted_error(e, file_contents, juice.build.canonical_path(source_filename)));
    //                                quit(2);
    //                            }
    //                            else {
    //                                throw e;
    //                            }
    //                        }
    //                    });

    //      output = ' ';
    //      if (juice.keys(templates).length > 0) {
    //          output =
    //              lhs + ' = { ' +
    //              juice.map_dict(templates,
    //                             function(k, v) {
    //                                 return k + ': ' + v;
    //                             }).join(',\n') +
    //              '};';
    //      }

    //      juice.build.write_file(target_filename, output);

    // };

     juice.build.compile_widget_package = function(lib_name, pkg_name) {
         var lib_path, pkg_path, widgets;

         lib_path = juice.build.find_library(lib_name);
         pkg_path = lib_path + '/widgets/' + pkg_name;

         widgets = juice.map(juice.sys.list_dir(pkg_path, {filter_re: /[.]js$/, fullpath: true}),
                             juice.build.read_file_and_scope_js);

         juice.build.write_target_file(
             'js/site/' + lib_name + '/widgets/' + pkg_name + '.js',
             ['juice.widget.define_package("' + pkg_name + '", function(juice, jQuery) {',
              'try {',
              //templates,
              widgets.join('\n'),
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
