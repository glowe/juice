
/*
 *
 * TODO: set up a "bin" dir for juice executables
 *
 * 1) command-line arguments:
 *
 * --js=path_to_executable (optional: use "js" in path by default)
 * --with-lib=juice-bar:/path/to/juice-bar/lib
 * --with-lib=jquery:/path/to/jquery/lib
 *
 * 1.5) juice/build/juice-config-nice.js (does what you think)
 *
 * 2) analyze site widgets to find external library dependencies (and do so
 * recursively with external libraries)
 *
 * 2.5) insure that all external libraries can be located, either in the
 * default juice lib path (specified in ~/.juice) or in the path specified on
 * the command-line to this program
 *
 * 3) store settings (library name => path mapping, original command line
 * settings (for nice config), etc.) in ./.juice-config.json
 *
 * NOTES:
 *
 * - During compilation, insure that dependencies on external libraries have
 not changed since the last time we ran configure.
 *
 */

// "JUICE_HOME"


var
new_lib_deps,
find_library,
program_options,
options,
site_lib_deps,          // recursive library dependencies for entire site
site_lib_name,
site_lib_path,
settings_filename,
lib_paths = {},
libs_seen = {};

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
                          return (juice.build.lib_name(filename) === name) ? filename : undefined;
                      });
    if (path) {
        return path;
    }
    return juice.error.raise('unable to locate library: '+name);
};

program_options = juice.program_options(
    {"settings=": ["path to site setting file", "settings/default.js"],
     "with-lib=[]": ["specify path to an external library", []]});

options = program_options.parse_arguments(argv);

//
// SETTINGS
//
// Possible TODOs:
// - Confirm that all settings keys are valid.
// - Check for required settings.
// - Maybe even check types of values (e.g. user must point to an object).
//

settings_filename = options['settings'];
if (juice.sys.file_exists(settings_filename) !== 'file') {
    juice.build.fatal('Settings file "'+settings_filename+'" not found.');
}
load(settings_filename);
// TODO: settings-related checks would go here.

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
juice.build.set_lib_paths(lib_paths);
juice.build.save_config();
juice.build.file_log().clear();
print('Run "juice compile" to build your site.');
