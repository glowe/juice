
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
                          return juice.build.lib_exists(name, filename) ? filename : undefined;
                      });
    if (path) {
        return path;
    }
    return juice.error.raise('unable to locate library: '+name);
};

program_options = juice.program_options(
    {"settings=": ["Specify path to site setting file.", "settings/default.js"],
     "with-lib=[]": ["Specify path to an external library.", []],
     "lint-juice": "Lint the juice framework.",
     "rpc-mocking": "Enable mocked remote procedure calls.",
     "mock-rpcs-by-default": "By default, mock all RPCs (requires --rpc-mocking).",
     "minify": "Optimized JavaScript output for size.",
     "help": "Display this message."});

options = program_options.parse_arguments(argv).options;

if (options.help) {
    print(program_options);
    juice.sys.exit(0);
}

if (options["mock-rpcs-by-default"] && !options["rpc-mocking"]) {
    juice.build.fatal("Cannot specify --mock-rpcs-by-default without --rpc-mocking.");
}

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
juice.build.config.set_lib_paths(lib_paths);
juice.build.config.set_site_settings_path(site_settings_path);
juice.build.config.set_lint_juice(options['lint-juice']);
juice.build.config.set_rpc_mocking(options['rpc-mocking']);
juice.build.config.set_mock_rpcs_by_default(options['mock-rpcs-by-default']);
juice.build.config.set_minify(options['minify']);
juice.build.config.save();
juice.build.file_log().clear();
print('Run "juice compile" to build your site.');
