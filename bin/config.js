
/*
 * TODO:
 *
 * juice/build/juice-config-nice.js (does what you think)
 */

// "JUICE_HOME"


var
find_library,
lib_paths = {},
libs_seen = {},
new_lib_deps,
options,
program_options,
site_lib_deps,          // recursive library dependencies for entire site
site_lib_name,
site_lib_path,
site_settings_path;

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

program_options = juice.program_options(
    {"settings=PATH": ["Specify PATH to site setting file.", "settings/default.js"],
     "help": "Display this message.",
     "debug": "By default, show debugging messages.",
     "lint-juice": "Lint the juice framework.",
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
site_lib_deps = juice.build.library_dependencies(site_lib_path);

// Recursively find all of our library dependencies
do {
    new_lib_deps = [];

    juice.foreach(site_lib_deps,
                  function(name) {
                      var path;
                      if (libs_seen[name]) {
                          return;
                      }
                      path = lib_paths[name] = find_library(name);
                      print('Found library '+name+' at "'+path+'".');
                      new_lib_deps.push(juice.build.library_dependencies(path));
                      libs_seen[name] = true;
                  });

    site_lib_deps =
        juice.build.merge_library_dependencies.apply(
            this,
            [site_lib_deps].concat(new_lib_deps));

} while (new_lib_deps.length != 0);

print('Saving configuration.');
juice.build.config.set_debug(options['debug']);
juice.build.config.set_lib_paths(lib_paths);
juice.build.config.set_lint_juice(options['lint-juice']);
juice.build.config.set_minify(options['minify']);
juice.build.config.set_rpc_mocking(!options['disable-rpc-mocking']);
juice.build.config.set_site_settings_path(site_settings_path);
juice.build.config.set_version_js_urls(options['version-js-urls']);
juice.build.config.save();
juice.build.unlink_file_logs();
print('Run "juice compile" to build your site.');
