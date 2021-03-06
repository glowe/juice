(function(juice){
     juice.build.compile_site_base = function(all_files) {
         var base,
         base_source_files,
         lib_util_map,
         pages,
         runtime_settings;

         base_source_files = all_files["base"];
         base_source_files = juice.group_by(base_source_files,
                                            function(file) {
                                                return file.category;
                                            });

         // Since runtime settings are a prerequisite for many
         // things, make sure they're the first thing in base.

         runtime_settings = juice.dict_intersect_keys(juice.build.site_settings(),
                                                      ['base_url',
                                                       'cookie_name',
                                                       'user']);
         runtime_settings.config = {
             debug: juice.build.config.debug(),
             rpc_mocking: juice.build.config.rpc_mocking()
         };

         base = ['site.settings=' + JSON.stringify(runtime_settings) + ';'];

         // Get the set of all library stubs and translate them into
         // javascript declarations. This will allow the client
         // programmer to make forward references to packages.

         juice.foreach(juice.build.all_library_stubs(),
                       function(lib_name, lib_stubs) {
                           base.push("site.lib."+lib_name+"="+JSON.stringify(lib_stubs)+";");
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
                           var source_code, templates;

                           source_code = juice.map(source_files, juice.build.read_source_file);

                           // Get this library's utility template source files.
                           templates = juice.filter(base_source_files.util_template,
                                                    function(source_file) {
                                                        return source_file.lib_name == lib_name;
                                                    });

                           // Compile the templates.
                           templates = juice.build.compile_templates(
                               juice.map(templates,
                                         function(source_file) {
                                             return source_file.path;
                                         }));

                           base = base.concat(
                               ['juice.util.define_package("' + lib_name + '", function(juice, site, jQuery) {',
                                'var templates = ' + templates + ';',
                                '(function() {' + source_code.join("\n") + '})();',
                                '});']);

                       });

         // Add the normal-category source files. This includs stuff
         // like layouts.js and proxies.js.

         base = base.concat(juice.map(base_source_files.normal, juice.build.read_and_scope_js_source_file));

         // Set the pages-initialization function to the contents of
         // the pages.js source file.

         pages = juice.build.read_and_scope_js_source_file(base_source_files.pages[0]);
         base = base.concat(["juice.page.set_init(function(juice, site, jQuery) {", pages, '});']);

         // We're done. Write the file.

         juice.build.write_target_script_file('js/base.js', base.join("\n"));
     };
 })(juice);
