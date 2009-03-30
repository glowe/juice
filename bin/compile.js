//
// FIXME: crawling source trees for all js files isn't going to work: it picks
// up too much random crap, makes the placement of js files in the tree too
// error-prone. Modify the various calls to file_find to look in specific,
// highly structures sub-trees.
//

var
all_source_files,
base_source_files,
changed_source_files,
file_log,
internal_lib_name,
juice_ext_web,
juice_web,
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

all_source_files = juice.map(required_source_files, juice.build.source_file);
// Add source files in other libraries
juice.foreach(juice.build.lib_paths(),
              function(lib_name, path) {
                  // 1.) Look for widget packages
                  // 2.) Look for rpc packages
                  // 3.) Look for util
                  // 4.) Look for style
                  // 5.) Look for proxies files in each library and tag them as global

                  all_source_files = all_source_files.concat(
                      juice.map(juice.build.file_find(path,
                                                      function(path) {
                                                          return /[.]js$/.test(path);
                                                      }),
                                function(path) {
                                    return juice.build.source_file(path, lib_name);
                                }));
              });

// Add juice/web
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home('web'), {filter_re:/[.]js$/, fullpath:true}),
              function(path) {
                  return juice.build.juice_source_file(path, false);
              }));


// Add juice ext files
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home('ext/web'), {filter_re:/[.]js$/, fullpath:true}),
              function(path) {
                  return juice.build.juice_source_file(path, true);
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
                       if (f.target_type == 'juice_web' || f.target_type == 'juice_ext_web') {
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
    base_source_files = juice.filter(all_source_files,
                                     function(source_file) {
                                         return source_file.target_type === "base";
                                     });

    juice.build.compile_site_base(base_source_files);
    print("Compile site base: OK");
}


if (!juice.empty(targets.widgets)) {
    juice.foreach(targets.widgets,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs, function(pkg_name) {
                          juice.build.compile_widget_package(lib_name, pkg_name);
                      });
                  });
    print("Compile widget packages: OK");
}

if (!juice.empty(targets.rpcs)) {
    juice.foreach(targets.rpcs,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs, function(pkg_name) {
                          juice.build.compile_rpc_package(lib_name, pkg_name);
                      });
                  });

    print("Compile rpc packages: OK");
}

if (targets.juice_web) {
    juice_web = juice.filter(all_source_files,
                             function(source_file) {
                                 return source_file.target_type === "juice_web";
                             });

    juice.build.compile_juice_web(juice_web);
    print("Compile juice web: OK");
}

if (targets.juice_ext_web) {
    juice_ext_web = juice.filter(all_source_files,
                             function(source_file) {
                                 return source_file.target_type === "juice_ext_web";
                             });

    juice.build.compile_juice_ext_web(juice_ext_web);
    print("Compile juice ext web: OK");
}

if (targets.pages) {
    // Ensure page paths are unique
    (function() {
         var seen = {};
         load("pages.js");

         juice.foreach(proj.pages,
                       function(name, page) {
                           if (!page.path_is_dynamic()) {
                               if (seen.hasOwnProperty(page.path())) {
                                   juice.build.fatal("Duplicate page path: " + page.path());
                               }
                               seen[page.path()] = true;
                           }
                       });
         print("Page paths unique: OK");
     })();


    // Compile pages
}


print(juice.dump(targets));

juice.foreach(all_source_files, function(f) { file_log.update_file(f.path); });

file_log.save();
