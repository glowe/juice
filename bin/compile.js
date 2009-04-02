// FIXME: group by on all_source_files on target type here so that
//        later calls are cheap (i.e., they don't have to filter
//        themselves).
var
all_source_files,
all_source_files_plus_user,
file_log,
internal_lib_name,
lint,
options,
program_options,
required_source_files,
settings_changed = false,
source_files,
targets = {
    base: false,
    juice_ext_web: false,
    juice_web: false,
    pages: false,
    rpcs: {},
    user: false,
    settings: false,
    widgets: {}
};


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
    juice.build.fatal("Unable to load build configuration. Perhaps you need to run 'juice config'?");
}

// Make sure required source files exist. E.g. pages.js, layouts.js.
required_source_files = ["macros.json", "pages.js", "layouts.js", "proxies.js"];
juice.foreach(required_source_files,
              function(filename) {
                  if (juice.sys.file_exists(filename) !== "file") {
                      juice.build.fatal("Missing a required source file: " + filename);
                  }
              });

// Insure the site has an internal library.
internal_lib_name = juice.build.lib_name("lib");
if (!internal_lib_name) {
    juice.build.fatal("Site library not found (expected to find it in './lib').");
}

all_source_files = juice.map(required_source_files,
                             function(path) {
                                 return juice.build.source_file({category: path === "pages.js" ? "pages" : "normal",
                                                                 path: path,
                                                                 target_type: "base"});
                             });

// FIXME: May want to error if we find a file that doesn't fit

// Add source files in libraries
juice.foreach(juice.build.lib_paths(),
              function(lib_name) {
                  all_source_files = all_source_files.concat(juice.build.find_widget_source_files(lib_name));
                  all_source_files = all_source_files.concat(juice.build.find_rpc_source_files(lib_name));
                  all_source_files = all_source_files.concat(juice.build.find_util_source_files(lib_name));
              });

// Add juice/web
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home("web"), {filter_re:/[.]js$/, fullpath:true}),
              function(path) {
                  return juice.build.source_file({category: 'js', path: path, target_type: "juice_web"});
              }));

// Add juice/web/templates
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home("web/templates"), {filter_re:/[.]html$/, fullpath:true}),
              function(path) {
                  return juice.build.source_file({category: 'template', path: path, target_type: "juice_web"});
              }));


// Add juice ext files
all_source_files = all_source_files.concat(
    juice.map(juice.sys.list_dir(juice.home("ext/web"), {filter_re:/[.]js$/, fullpath:true}),
              function(path) {
                  return juice.build.source_file({path: path, target_type: "juice_ext_web"});
              }));

all_source_files.push(juice.build.source_file({target_type: "settings", path: juice.build.site_settings_path()}));

// Load the user-defined compile hooks, then locate the source files they're
// interested in and combine them with all_source_files in a new array.

if (juice.sys.file_exists("hooks.js")) {
    juice.build.eval_file("hooks.js");
    all_source_files_plus_user = all_source_files.concat(juice.build.find_user_categorized_source_files());
    all_source_files_plus_user.push(
        juice.build.source_file({category: "user-defined hooks",
                                 path: "hooks.js",
                                 target_type: "user"}));
}
else {
    all_source_files_plus_user = all_source_files;
}

file_log = juice.build.file_log(all_source_files_plus_user);

if (file_log.empty()) {
    print("Starting full build...");
}
else if (file_log.has_file_changed(juice.build.site_settings_path())) {
    juice.build.clean();
    print("Settings file changed (" + juice.build.site_settings_path() + "); starting from scratch.");
    settings_changed = true;
}

// Determine which source files have changed since the last compile. For each
// source file that has changed, mark its targets as needing to be recompiled.

juice.foreach(all_source_files_plus_user,
              function(f) {
                  f.changed = settings_changed || file_log.has_file_changed(f.path);
                  if (f.changed) {
                      lint = true;
                      if (f.target_type === "widgets" || f.target_type === "rpcs") {
                          juice.mset(targets, true, [f.target_type, f.lib_name, f.pkg_name]);
                      }
                      else {
                          targets[f.target_type] = true;
                      }

                      if (f.category == "pages" || f.category == "meta") {
                          targets.pages = true;
                      }
                  }
              });

// Lint all source files.

if (lint) {
    print("Linting...");
    juice.foreach(all_source_files_plus_user,
                  function(f) {
                      var errors, ext;
                      if (!f.changed) {
                          return;
                      }
                      ext = juice.sys.parse_path(f.path).ext;
                      if (ext != "js" && ext != "json") {
                          return;
                      }
                      if (f.target_type == "juice_ext_web") {
                          return;
                      }
                      errors = juice.build.lint_js(f.path);
                      if (errors.length) {
                          juice.foreach(errors, function(e) { print(e); });
                          juice.build.fatal("JSLINT failed. Aborting.");
                      }
                  });
    print("Lint: OK.");
}

// Determine which targets need to be recompiled.

if (targets.base) {
    juice.build.compile_site_base(all_source_files);
    print("Compile site base: OK.");
}

if (!juice.empty(targets.widgets)) {
    juice.foreach(targets.widgets,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs,
                                    function(pkg_name) {
                                        juice.build.compile_widget_package(lib_name, pkg_name, all_source_files);
                                    });
                  });
    print("Compile widget packages: OK.");
}

if (!juice.empty(targets.rpcs)) {
    juice.foreach(targets.rpcs,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs,
                                    function(pkg_name) {
                                        juice.build.compile_rpc_package(lib_name, pkg_name, all_source_files);
                                    });
                  });
    print("Compile rpc packages: OK.");
}

if (targets.juice_web) {
    juice.build.compile_juice_web(all_source_files);
    print("Compile juice web: OK.");
}

if (targets.juice_ext_web) {
    juice.build.compile_juice_ext_web(all_source_files);
    print("Compile juice ext web: OK.");
}

if (targets.pages) {
    juice.build.lint_page_paths("pages.js");
    print("Lint pages: OK.");

    juice.build.compile_pages("pages.js");
    print("Compile pages: OK.");
}

if (targets.user) {
    juice.build.run_user_source_file_appliers();
    print("User defined hooks: OK.");
}

if (juice.build.site_settings().minify) {
    // FIXME: only minify what we have to
    juice.build.minify();
    print("Minify: OK.");
}

print("Done.");

juice.foreach(all_source_files_plus_user, function(f) { file_log.update_file(f.path); });
file_log.save();
