var
all_source_files,
changed_source_files,
file_log,
internal_lib_name,
options,
program_options,
required_source_files,
targets;

program_options = juice.program_options(
    {"clean": "remove build targets"});

options = program_options.parse_arguments(argv);

if (options.clean) {
    juice.build.clean();
    print("You are now clean.");
    juice.sys.exit(0);
}

try {
    juice.build.load_config();
}
catch (e) {
    juice.build.fatal('Unable to load build configuration. Perhaps you need to run "juice config"?');
}

// Make sure required source files exist. E.g. pages.js, layouts.js.
required_source_files = ['pages.js', 'layouts.js'];
juice.foreach(required_source_files,
              function(filename) {
                  if (juice.sys.file_exists(filename) !== 'file') {
                      juice.error.raise('Missing a required source file: '+filename);
                  }
              });

// Insure the site has an internal library.
internal_lib_name = juice.build.lib_name('lib');
if (!internal_lib_name) {
    juice.error.raise('Site library not found (expected to find it in "./lib").');
}

all_source_files = juice.map(required_source_files, juice.build.source_file);
juice.foreach(juice.build.lib_paths(),
              function(lib_name, path) {
                  all_source_files = all_source_files.concat(
                      juice.map(juice.build.file_find(path,
                                                      function(path) {
                                                          return /[.]js$/.test(path);
                                                      }),
                                function(path) {
                                    return juice.build.source_file(path, lib_name);
                                }));
              });

//
// TODO: insure that all referenced packages exist, so we don't have to check all the time.
//

file_log = juice.build.file_log(all_source_files);

changed_source_files =
    juice.filter(all_source_files,
                 function(f) {
                     return file_log.has_file_changed(f.path);
                 });

// Lint source files.
juice.foreach(changed_source_files,
              function(f) {
                  var errors = juice.build.lint_js(f.path);
                  if (errors.length) {
                      juice.foreach(errors, function(e) { print(e); });
                      print('JSLINT failed. Aborting.');
                      juice.sys.exit(2);
                  }
              });
print('Lint: OK.');

// Determine which targets need to be recompiled.
targets = {widgets: {}, rpcs: {}, global: false, pages: false};
juice.foreach(changed_source_files,
              function(f) {
                  if (f.target_type == 'widgets' || f.target_type == 'rpcs') {
                      juice.mset(targets, [f.target_type, f.lib_name, f.pkg_name], true);
                  }
                  else {
                      targets[f.target_type] = true;
                  }
              });

print(juice.dump(targets));

juice.foreach(all_source_files, function(f) { file_log.update_file(f.path); });
file_log.save();
