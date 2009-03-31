var
all_source_files,
base_source_files,
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
required_source_files = ['macros.json', 'pages.js', 'layouts.js'];
juice.foreach(required_source_files,
              function(filename) {
                  if (juice.sys.file_exists(filename) !== 'file') {
                      juice.build.fatal('Missing a required source file: '+filename);
                  }
              });

// Insure the site has an internal library.
internal_lib_name = juice.build.lib_name('lib');
if (!internal_lib_name) {
    juice.build.fatal('Site library not found (expected to find it in "./lib").');
}

all_source_files = juice.map(required_source_files,
                             function(path) {
                                 var target_type = path !== "pages.js" ? "base" : "pages";
                                 return juice.build.source_file({path: path,
                                                                 target_type: target_type});
                             });


// FIXME: May want to error if we find a file that doesn't fit

// Add source files in libraries
juice.foreach(juice.build.lib_paths(),
              function(lib_name) {
                  all_source_files = all_source_files.concat(juice.build.find_widget_source_files(lib_name));
                  all_source_files = all_source_files.concat(juice.build.find_rpc_source_files(lib_name));
                  all_source_files = all_source_files.concat(juice.build.find_util_source_files(lib_name));
                  // FIXME: How do we handle style files?
              });

// Add juice/web
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home('web'), {filter_re:/[.]js$/, fullpath:true}),
              function(path) {
                  return juice.build.source_file({path: path, target_type: "juice_web"});
              }));


// Add juice ext files
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home('ext/web'), {filter_re:/[.]js$/, fullpath:true}),
              function(path) {
                  return juice.build.source_file({path: path, target_type: "juice_ext_web"});
              }));


//
// TODO: insure that all referenced packages exist, so we don't have to check all the time.
//

file_log = juice.build.file_log(all_source_files);

changed_source_files =
    juice.filter(all_source_files,
                 function(f) {
                     return file_log.has_file_changed(f.path);
                 });

// Lint all non juice source files.
(function() {
     var has_linted = false;
     juice.foreach(changed_source_files,
                   function(f) {
                       if (f.target_type == 'juice_web' ||
                           f.target_type == 'juice_ext_web' ||
                           (f.path.slice(-3) != ".js" && f.path.slice(-5) != ".json")) {
                           return;
                       }
                       has_linted = true;
                       var errors = juice.build.lint_js(f.path);
                       if (errors.length) {
                           juice.foreach(errors, function(e) { print(e); });
                           juice.build.fatal('JSLINT failed. Aborting.');
                       }
                   });
     if (has_linted) {
         print('Lint: OK.');
     }
 })();

// Determine which targets need to be recompiled.
targets = {widgets: {}, rpcs: {}, base: false, pages: false, 'juice_web': false, 'juice_ext_web': false};
juice.foreach(changed_source_files,
              function(f) {
                  if (f.target_type == 'widgets' || f.target_type == 'rpcs') {
                      juice.mset(targets, [f.target_type, f.lib_name, f.pkg_name], true);
                  }
                  else {
                      targets[f.target_type] = true;
                  }
              });


if (targets.base) {
    juice.build.compile_site_base(all_source_files);
    print("Compile site base: OK");
}

if (!juice.empty(targets.widgets)) {
    juice.foreach(targets.widgets,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs,
                                    function(pkg_name) {
                                        juice.build.compile_widget_package(lib_name, pkg_name, all_source_files);
                                    });
                  });
    print("Compile widget packages: OK");
}

if (!juice.empty(targets.rpcs)) {
    juice.foreach(targets.rpcs,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs,
                                    function(pkg_name) {
                                        juice.build.compile_rpc_package(lib_name, pkg_name, all_source_files);
                                    });
                  });
    print("Compile rpc packages: OK");
}

if (targets.juice_web) {
    juice.build.compile_juice_web(all_source_files);
    print("Compile juice web: OK");
}

if (targets.juice_ext_web) {
    juice.build.compile_juice_ext_web(all_source_files);
    print("Compile juice ext web: OK");
}

if (targets.pages) {
    juice.build.lint_page_paths('pages.js');
    print("Lint pages: OK");
    juice.build.compile_pages('pages.js');
    print("Compile pages: OK");
}


print(juice.dump(targets));

juice.foreach(all_source_files, function(f) { file_log.update_file(f.path); });

file_log.save();
