var
add_widget_package,         // adds a widget package and its dependencies to source_packages
destination_path,           // where to write program's output
options,                    // command-line options specified with "--"
output_content,             // source code output generated by this program
po,                         // parsed program options
program_options,            // specifies the options accepted by this program
source_files,               // list of source files to include in the box
source_namespaces,          // namespaces to put in the box; supplied by caller
source_packages = {};       // list of source packages to include in the box

add_widget_package = function(namespace) {
    var lib_path, metadata;

    if (juice.mhas(source_packages, namespace.split())) {
        return; // we already explored this widget package
    }
    juice.mset(source_packages, true, namespace.split());

    lib_path = juice.build.lib_path(namespace.lib_name);
    metadata = juice.build.read_widget_package_metadata(lib_path, namespace.pkg_name);

    juice.foreach(metadata.dependencies,
                  function(lib_name, packages) {
                      juice.foreach(packages["widgets"],
                                    function(pkg_name) {
                                        var ns = juice.namespace.make(lib_name, "widgets", pkg_name);
                                        add_widget_package(ns);
                                    });
                      juice.foreach(packages["rpcs"],
                                    function(pkg_name) {
                                        juice.mset(source_packages, true, [lib_name, "rpcs", pkg_name]);
                                    });
                  });
};

// Parse and process command-line arguments.

program_options = juice.program_options(
    {"cd=DIR": ["Change to DIR before doing anything.", "."],
     "help": "Display this message.",
     "packages-only": "Exclude the juice runtime from the archive.",
     "unminified": "Use non-minified code even when minification is enabled."});

po = program_options.parse_arguments(argv);
options = po.options;

juice.build.handle_help(
    options.help,
    "box DESTINATION-PATH WIDGET-PACKAGE [WIDGET-PACKAGE...]",
    "Creates a standalone source file containing a set of widget packages and their dependencies.");

juice.sys.chdir(options.cd);

juice.build.config.load();
juice.build.load_versioned_paths();

if (po.unconsumed.length === 0) {
    juice.build.fatal("You must specify a destination path.");
}
if (po.unconsumed.length === 1 && options["packages-only"]) {
    juice.build.fatal("You must specify at least one widget package when using the --packages-only option.");
}

destination_path = po.unconsumed[0];
source_namespaces = juice.map(po.unconsumed.slice(1), juice.namespace.parse);

// Make sure the build is up to date.
if (juice.sys.system("juice compile --check >/dev/null") !== 0) {
    juice.build.fatal('The build is out of date. Run "juice compile" first.');
}

// Start out with the fundamental source files.
source_files = options["packages-only"]
    ? []
    : ["js/juice-ext.js", "js/juice-web.js", "js/base.js"];

// Add all caller-specified widget packages.
juice.foreach(source_namespaces,
              function(ns) {
                  if (ns.pkg_type !== "widgets") {
                      juice.build.fatal('"'+ns+'" is not a widget package.');
                  }
                  if (juice.is_undefined(ns.pkg_name)) {
                      juice.build.fatal('"'+ns+'" does not refer to a package.');
                  }
                  add_widget_package(ns);
              });

// Now that we know what source packages to include in the box, convert them
// to filesystem paths.
juice.foreach(source_packages,
              function(lib_name, packages) {
                  juice.foreach(packages,
                                function(pkg_type, pkg_names) {
                                    juice.foreach(pkg_names,
                                                  function(pkg_name) {
                                                      source_files.push(
                                                          juice.build.compiled_package_path(
                                                              lib_name, pkg_type, pkg_name));
                                                  });
                                });
              });

// Apply various path transformations.
if (!options.unminified) {
    source_files = juice.map(source_files, juice.build.minified_path);
}
source_files = juice.map(source_files, juice.build.target_file_path);

// Read all files, concatenate, and write to the output file.
print("Archiving...");
output_content = "";
juice.foreach(source_files,
              function(path) {
                  print("  "+path);
                  output_content += juice.sys.read_file(path);
              });
juice.sys.write_file(destination_path, output_content, true);
print("Wrote "+output_content.length+" bytes to "+destination_path);
