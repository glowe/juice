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
                           var util = juice.map(source_files,
                                                function(source) {
                                                    return juice.sys.read_file(source.path);
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

         runtime_settings = juice.dict_intersect_keys(juice.build.site_settings(),
                                                      ['base_url',
                                                       'cookie_name',
                                                       'user']);
         runtime_settings.config = {
             debug: juice.build.config.debug(),
             rpc_mocking: juice.build.config.rpc_mocking()
         };

         // Since settings are prerequisite for many things, make sure they're set first.
         base.unshift('site.settings=' + JSON.stringify(runtime_settings) + ';');

         juice.build.write_target_file(
             'js/base.js',
             base.join("\n"));
     };
 })(juice);
