var
all_source_files,           // List of every source file known to the system.
all_source_files_plus_user, // all_source_files plus user-categorized source files.
explicit_targets = {},      // Build targets explicitly specified on command line.
file_log,                   // Tracks which files have changed since last compile.
grouped_source_files,       // Grouped all_source_files
internal_lib_name,          // The name of the site's internal library.
options,                    // Command-line options specified with "--"
po,                         // Parsed program options.
program_options,            // Specifies the options accepted by this program.
required_source_files,      // Filenames of mandatory source files.
settings_changed = false,   // Did our settings file change?
targets = {                 // Specifies which targets might require recompilation.
    base: false,
    juice_ext_web: false,
    juice_web: false,
    pages: false,
    rpcs: {},
    user: false,
    settings: false,
    widgets: {}
};

// Parse and process command-line arguments.

program_options = juice.program_options(
    {"cd=DIR"  : ["Change to DIR before doing anything.", "."],
     "help"    : "Display this message.",
     "all"     : "Recompile all targets.",
     "clean"   : "Delete all compiled output before doing anything.",
     "base"    : "Recompile the site base file.",
     "pages"   : "Recompile all pages.",
     "rpcs"    : "Recompile all RPC packages.",
     "widgets" : "Recompile all widget packages.",
     "user"    : "Recompile all user-supplied hooks."});

po = program_options.parse_arguments(argv);
options = po.options;

if (!juice.empty(po.unconsumed)) {
    juice.build.fatal("Unrecognized arguments: " + po.unconsumed.join(", "));
}

juice.build.handle_help(
    options.help,
    "compile",
    "Compiles a site. juice config must be run first.");

juice.sys.chdir(options.cd);

// Before we do anything potentially destructive, make sure we are in a valid,
// configured site directory.
juice.build.config.load();
juice.build.load_versioned_paths();

// If the user specified the meta-target "all", recompile all targets.

if (options.all) {
    juice.foreach(targets, function(k) { explicit_targets[k] = true; });
}
else {
    juice.foreach(targets,
                  function(k) {
                      if (options[k]) {
                          explicit_targets[k] = true;
                      }
                  });
}

// If the user specified the "clean" option, reset the build. Also, if that
// was the only explicit target, exit without compiling anything.

if (options.clean) {
    juice.build.clean();
    print("You are now clean.");
    if (juice.empty(explicit_targets)) {
        juice.sys.exit(0);
    }
}

// Make sure required source files exist. E.g. pages.js, layouts.js.
required_source_files = ["pages.js", "layouts.js", "proxies.js"];
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
juice.foreach(juice.build.config.lib_paths(),
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

all_source_files.push(juice.build.source_file({target_type: "settings", path: juice.build.config.site_settings_path()}));
all_source_files.push(juice.build.make_all_library_stubs_source_file());

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

file_log = juice.build.file_log(all_source_files_plus_user, "source");

if (file_log.empty()) {
    print("Starting full build...");
}
else if (file_log.has_file_changed(juice.build.config.site_settings_path())) {
    juice.build.clean();
    print("Settings file changed (" + juice.build.config.site_settings_path() + "); starting from scratch.");
    settings_changed = true;
}

// Determine which source files have changed since the last compile. For each
// source file that has changed, mark its targets as needing to be recompiled.

juice.foreach(all_source_files_plus_user,
              function(f) {
                  f.changed = settings_changed || file_log.has_file_changed(f.path);

                  if (f.target_type === "widgets" || f.target_type === "rpcs") {

                      // Widgets and rpcs require special handling because
                      // they are recompiled on a per-package basis.
                      // Therefore, we must also check whether
                      // explicit_targets contains "rpcs" or "widgets" here.

                      if (f.changed || explicit_targets[f.target_type]) {
                          juice.mset(targets, true, [f.target_type, f.lib_name, f.pkg_name]);
                      }
                  }
                  else if (f.changed) {
                      targets[f.target_type] = true;
                      if (f.category == "pages" || f.category == "meta") {
                          targets.pages = true;
                      }
                  }
              });

// If the caller specified explicit targets (other than rpcs and widgets,
// which we checked above), mark those targets for recompilation.

juice.foreach(targets,
              function(k) {
                  if (explicit_targets[k] && k != "rpcs" && k != "widgets") {
                      targets[k] = true;
                  }
              });

grouped_source_files = juice.group_by(all_source_files, function(file) { return file.target_type; });

// Determine which targets need to be recompiled.

if (targets.pages) {
    juice.build.lint_pages();
    print("Lint pages: OK.");
}

if (targets.pages || targets.base) {
    juice.build.compile_site_base(grouped_source_files);
    print("Compile site base: OK.");
}

if (!juice.empty(targets.widgets)) {
    juice.foreach(targets.widgets,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs,
                                    function(pkg_name) {
                                        juice.build.compile_widget_package(lib_name, pkg_name, grouped_source_files);
                                    });
                  });
    print("Compile widget packages: OK.");
}

if (!juice.empty(targets.rpcs)) {
    juice.foreach(targets.rpcs,
                  function(lib_name, pkgs) {
                      juice.foreach(pkgs,
                                    function(pkg_name) {
                                        juice.build.compile_rpc_package(lib_name, pkg_name, grouped_source_files);
                                    });
                  });
    print("Compile rpc packages: OK.");
}

if (targets.juice_web) {
    juice.build.compile_juice_web(grouped_source_files);
    print("Compile juice web: OK.");
}

if (targets.juice_ext_web) {
    juice.build.compile_juice_ext_web(grouped_source_files);
    print("Compile juice ext web: OK.");
}

if (targets.user) {
    juice.build.run_user_source_file_appliers();
    print("User defined hooks: OK.");
}

// Post-processing steps: (1) lint any javascript build output that has
// changed since the last compile, and then (2) minify those changed files.

juice.build.lint();
if (juice.build.config.minify()) {
    juice.build.minify();
}

// When should we recompile pages?
//
// (1) Obvious.
//
// (2) Recompiling widgets implies that the widget package dependency graph
// may have changed, which means the set of javascript urls we have to include
// on pages may have changed.
//
// (3) If we are configured to include content hashes in compiled js urls, we
// should recompile pages every time we run. It's possible to be smarter about
// this, but we're going to pretend it isn't worth the trouble.

if (targets.pages ||                       // (1)
    !juice.empty(targets.widgets) ||       // (2)
    juice.build.config.version_js_urls())  // (3)
{
    juice.build.compile_pages();
    print("Compile pages: OK.");
}


print("Done.");

file_log.save_and_update_all();
juice.build.save_versioned_paths();

