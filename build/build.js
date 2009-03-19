(function(juice) {

     var config;

     juice.build = {};

     juice.build.configure = function(c) {
         config = c;
     };

     juice.build.save_config = function() {
         // write config to disk ("./.juice-config.json")
     };

     juice.build.load_config = function() {
         // read config to disk ("./.juice-config.json")
     };

     juice.build.find_library = function(libname) {
         // search the libpath
         return config.libraries[libname];
     };

     // {
     //     dependencies: [
     //         "juice_bar.rpcs.bar",
     //         "juice_bar.widgets.core",
     //         "juice_bar.widgets.notes",
     //         "someotherlib.widgets.foo"
     //     ],
     //     stylesheet_urls: [
     //         "http://somesite.com/foo.css"
     //     ],
     //     script_urls: [
     //         "..."
     //     ]
     // }

     juice.build.load_json_file = function(filename) {
         var answer;
         eval('answer = ' + juice.sys.read_file(filename));
         return answer;
     };

     juice.build.lib_name = function(path) {
         var json, lib_json_path;
         lib_json_path = path + '/lib.json';
         if (juice.sys.file_exists(lib_json_path) != 'file') {
             return false;
         }
         json = juice.build.load_json_file(lib_json_path);
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
         json = juice.build.load_json_file(pkg_filename);

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

         juice.foreach(juice.sys.read_dir(libpath + '/widgets/'),
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
