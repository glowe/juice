
/*
 * TODO:
 *
 * juice/build/juice-config-nice.js (does what you think)
 */

// "JUICE_HOME"


var
find_library,           // searches the filesystem for a library given its name
lib_paths = {},         // maps library names to filesystem paths
options,                // command-line options specified with "--"
program_options,        // specifies the options accepted by this program
search_library_deps,    // finds all libraeries on which our site depends; store in lib_paths
site_lib_name,          // name of our site's internal library
site_lib_path,          // path to site_lib_name
site_settings_path;     // user-supplied settings file

find_library = function(name) {
    var path = lib_paths[name];
    if (path) {
        if (juice.build.lib_name(path) !== name) {
            juice.error.raise('library "'+name+'" not found in "'+path+'"');
        }
        return path;
    }
    path = juice.find(juice.sys.list_dir(juice.libpath(), {fullpath:true}),
                      function(filename) {
                          return juice.find(["", "lib"],
                                            function(dir) {
                                                var filename2 = juice.path_join(filename, dir);
                                                if (juice.build.lib_exists(name, filename2)) {
                                                    return filename2;
                                                }
                                                return undefined;
                                            });
                      });
    if (path) {
        return path;
    }
    return juice.error.raise('unable to locate library: '+name);
};

search_library_deps = function(lib_path) {
    // For each widget package in the library...
    juice.foreach(juice.sys.list_dir(juice.path_join(lib_path, 'widgets')),
                  function(pkg) {
                      // For each library on which this widget package depends...
                      juice.foreach(juice.build.read_widget_package_metadata(lib_path, pkg).dependencies,
                                    function(lib_name) {
                                        // If we have not already explored this library...
                                        if (!lib_paths.hasOwnProperty(lib_name)) {
                                            lib_paths[lib_name] = find_library(lib_name);
                                            print('Found library '+lib_name+' at "'+lib_paths[lib_name]+'".');
                                            search_library_deps(lib_paths[lib_name]); // recurse
                                        }
                                    });
                  });
};

program_options = juice.program_options(
    {"settings=PATH": ["Specify PATH to site setting file.", "settings/default.js"],
     "help": "Display this message.",
     "debug": "By default, show debugging messages.",
     "minify": "Optimize JavaScript output for size.",
     "disable-rpc-mocking": "Disable mocked remote procedure calls.",
     "version-js-urls": "Include sha1 content hashes in .js URLs.",
     "with-lib=[]": ["Specify path to an external library <libname:PATH>.", []]});

options = program_options.parse_arguments(argv).options;

juice.build.handle_help(options.help, "config [OPTIONS]", "Configures compile-time options for a site.");

site_settings_path = options.settings;
if (juice.sys.file_exists(site_settings_path) !== 'file') {
    juice.build.fatal('Settings file "'+site_settings_path+'" not found.');
}
print('Using settings file at "'+site_settings_path+'".');

// Parse the --with-lib command line option.
juice.foreach(options['with-lib'],
              function(opt) {
                  var parts = opt.split(':');
                  if (parts.length != 2) {
                      juice.error.raise('malformed --with-lib option: '+opt);
                  }
                  lib_paths[parts[0]] = parts[1];
              });

// Handle our site's internal library.
site_lib_path = juice.sys.canonical_path('./lib');
if (!(site_lib_name = juice.build.lib_name(site_lib_path))) {
    juice.error.raise("couldn't find library at "+site_lib_path);
}
lib_paths[site_lib_name] = site_lib_path;

// Search for all our library dependencies.
search_library_deps(site_lib_path);

print('Saving configuration.');
juice.build.config.set_debug(options['debug']);
juice.build.config.set_lib_paths(lib_paths);
juice.build.config.set_minify(options['minify']);
juice.build.config.set_rpc_mocking(!options['disable-rpc-mocking']);
juice.build.config.set_site_settings_path(site_settings_path);
juice.build.config.set_version_js_urls(options['version-js-urls']);
juice.build.config.save();
juice.build.unlink_file_logs();
print('Run "juice compile" to build your site.');
