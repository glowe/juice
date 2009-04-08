var site_name, lib_path, usage, default_settings_template

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

var settings_path = juice.path_join(site_name, "settings");
juice.sys.mkdir(settings_path);
eval("default_settings_template = " +
     juice.build.compile_template_file(juice.path_join(juice.home(), "tools/templates/default.js"),
                                       {macros: {}}));
juice.sys.write_file(juice.path_join(settings_path, "default.js"),
                     default_settings_template({site_name: site_name}),
                     true);
print("Setup default settings: OK");

var widgets_path = juice.path_join(lib_path, "widgets");
juice.sys.mkdir(widgets_path);

print("Setup widgets dir: OK");

var rpcs_path = juice.path_join(lib_path, "rpcs");
juice.sys.mkdir(rpcs_path);

print("Setup rpcs dir: OK");

var util_path = juice.path_join(lib_path, "util");
juice.sys.mkdir(util_path);

print("Setup util dir: OK");

var user_path = juice.path_join(lib_path, "util");
juice.sys.mkdir(user_path);

print("Setup util dir: OK");

juice.sys.write_file(juice.path_join(site_name, "macros.json"),
                     JSON.stringify({}),
                     true);
print("Created empty macros file: OK");

juice.sys.write_file(juice.path_join(site_name, "pages.js"),
                     juice.sys.read_file(juice.path_join(juice.home(), "tools/templates/pages.js")),
                     true);
print("Created pages file: OK");

juice.sys.write_file(juice.path_join(site_name, "layouts.js"),
                     juice.sys.read_file(juice.path_join(juice.home(), "tools/templates/layouts.js")),
                     true);
print("Created layouts file: OK");

juice.sys.write_file(juice.path_join(site_name, "proxies.js"),
                     juice.sys.read_file(juice.path_join(juice.home(), "tools/templates/proxies.js")),
                     true);
print("Created proxies file: OK");

