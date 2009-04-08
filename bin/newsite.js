var site_name, lib_path, usage;

usage = function(msg) {
    print("Error: " + msg);
    print("\nUsage: juice newsite <name>");
    print("\nDESCRIPTION");
    print("\nname  Must be a legal javascript identifier (i.e., starts with a");
    print("      letter or $, then letters, $, numbers, or _s).");
    juice.sys.exit(2);
};

if (argv.length != 1) {
    usage("Missing site name!");
}

site_name = argv[0];

if (!/^[a-z]|\$[a-z0-9_\$]*/i.test(site_name)) {
    usage("Invalid site name: " + site_name);
}

juice.sys.mkdir(site_name);

print("Setup site base dir ("+juice.sys.canonical_path(site_name)+"): OK");

lib_path = juice.path_join(site_name, "lib");
juice.sys.mkdir(lib_path);
juice.sys.write_file(juice.path_join(lib_path, "lib.json"),
                     JSON.stringify({name: site_name}),
                     true);

print("Setup site library metadata ("+site_name+"): OK");

(function() {
     var settings_path = juice.path_join(site_name, "settings"), template;
     juice.sys.mkdir(settings_path);
     template = juice.build.compile_template(juice.path_join(juice.home(), "tools/templates/default.js"),
                                             {macros: {}});
     juice.sys.write_file(juice.path_join(settings_path, "default.js"),
                          template({site_name: site_name}),
                          true);
     print("Setup default settings: OK");
 })();

(function() {
     var widgets_path = juice.path_join(lib_path, "widgets");
     juice.sys.mkdir(widgets_path);
     print("Setup widgets dir: OK");

     var sandbox_path = juice.path_join(widgets_path, "sandbox");
     juice.sys.mkdir(sandbox_path);
     juice.sys.write_file(juice.path_join(sandbox_path, "package.json"),
                          JSON.stringify({dependencies: []}),
                          true);
     juice.sys.write_file(juice.path_join(sandbox_path, "welcome.js"),
                          juice.sys.read_file(juice.home() + "/tools/templates/welcome.js"),
                          true);

     var template = juice.build.compile_template(juice.path_join(juice.home(), "tools/templates/welcome.html"),
                                                 {macros: {}});
     var templates_path = juice.path_join(sandbox_path, "templates");
     juice.sys.mkdir(templates_path);
     juice.sys.write_file(juice.path_join(templates_path, "welcome.html"),
                          template({lib_path: juice.sys.canonical_path(lib_path),
                                    site_path: juice.sys.canonical_path(site_name)}),
                          true);
     print("Wrote welcome widget: OK");
 })();

var rpcs_path = juice.path_join(lib_path, "rpcs");
juice.sys.mkdir(rpcs_path);
print("Setup rpcs dir: OK");

var util_path = juice.path_join(lib_path, "util");
juice.sys.mkdir(util_path);
print("Setup util dir: OK");

var user_path = juice.path_join(lib_path, "user");
juice.sys.mkdir(user_path);
print("Setup user dir: OK");

juice.sys.write_file(juice.path_join(site_name, "macros.json"),
                     JSON.stringify({}),
                     true);
print("Created empty macros file: OK");

(function() {
     var template = juice.build.compile_template(juice.path_join(juice.home(), "tools/templates/pages.js"),
                                                 {macros: {}});
     juice.sys.write_file(juice.path_join(site_name, "pages.js"),
                          template({site_name: site_name}),
                          true);
     print("Created pages file: OK");
 })();

juice.sys.write_file(juice.path_join(site_name, "layouts.js"),
                     juice.sys.read_file(juice.path_join(juice.home(), "tools/templates/layouts.js")),
                     true);
print("Created layouts file: OK");

juice.sys.write_file(juice.path_join(site_name, "proxies.js"),
                     juice.sys.read_file(juice.path_join(juice.home(), "tools/templates/proxies.js")),
                     true);
print("Created proxies file: OK");

var style_path = juice.path_join(site_name, "user/style");
juice.sys.mkdir(style_path);
juice.sys.write_file(juice.path_join(style_path, "site.ecss"),
                     juice.sys.read_file(juice.path_join(juice.home(), "tools/templates/site.ecss")),
                     true);
print("Write site.ecss: OK");

(function() {
     var template = juice.build.compile_template(juice.path_join(juice.home(), "tools/templates/hooks.js"),
                                                 {macros: {}});
     juice.sys.write_file(juice.path_join(site_name, "hooks.js"),
                          template({site_name: site_name}),
                          true);
 })();
