var
lib_path,
options,
po,
program_options,
site_base_url,
site_name,
write_template;

program_options = juice.program_options(
    {"help": "Display this message."});
po = program_options.parse_arguments(argv);
options = po.options;

site_base_url = "http://localhost:8000";

write_template = function(filename, output_base_path) {
    var template_path, template;

    template_path =
        juice.path_join(juice.home(), "tools/templates/", filename);
    template = juice.build.compile_template(template_path, {macros: {}});

    juice.sys.write_file(juice.path_join(output_base_path, filename),
                         template({site_name: site_name,
                                   site_base_url: site_base_url}),
                         true);
};

juice.build.handle_help(
    options.help,
    "newsite <name>",
    ("Creates scaffolding for a new site. The 'name' argument specifies\n" +
     "the name of the site; it must be a legal javascript identifier\n" +
     "(i.e., starts with a letter or $, then letters, $, numbers, or _."));

if (po.unconsumed.length != 1) {
    juice.build.fatal("Missing site name! Try --help.");
}

site_name = po.unconsumed[0];

if (!/^[a-z]|\$[a-z0-9_\$]*/i.test(site_name)) {
    juice.build.fatal("Invalid site name: " + site_name + ". Try --help");
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
     var settings_path = juice.path_join(site_name, "settings");
     juice.sys.mkdir(settings_path);
     write_template("default.js", settings_path);
     print("Setup default settings: OK");
 })();

(function() {
     var sandbox_path, templates_path, widgets_path;
     widgets_path = juice.path_join(lib_path, "widgets");
     juice.sys.mkdir(widgets_path);
     print("Setup widgets dir: OK");

     sandbox_path = juice.path_join(widgets_path, "sandbox");
     juice.sys.mkdir(sandbox_path);
     juice.sys.write_file(juice.path_join(sandbox_path, "package.json"),
                          JSON.stringify({dependencies: []}),
                          true);
     write_template("welcome.js", sandbox_path);

     templates_path = juice.path_join(sandbox_path, "templates");
     juice.sys.mkdir(templates_path);
     write_template("welcome.html", templates_path);
     print("Wrote welcome widget: OK");
 })();

juice.sys.mkdir(juice.path_join(lib_path, "rpcs"));
print("Setup rpcs dir: OK");


juice.sys.mkdir(juice.path_join(lib_path, "util"));
print("Setup util dir: OK");


juice.sys.mkdir(juice.path_join(lib_path, "user"));
print("Setup user dir: OK");

juice.sys.write_file(juice.path_join(site_name, "macros.json"),
                     JSON.stringify({}),
                     true);
print("Created empty macros.json file: OK");

write_template("pages.js", site_name);
print("Created pages.sj file: OK");

write_template("layouts.js", site_name);
print("Created layouts file: OK");

write_template("proxies.js", site_name);
print("Created proxies file: OK");

(function() {
     var style_path = juice.path_join(site_name, "user/style");
     juice.sys.mkdir(style_path);
     write_template("site.ecss", style_path);
     print("Created site.ecss: OK");
 })();

write_template("hooks.js", site_name);
print("Created hooks.js: OK");

print("Done.");
print("\nTo inspect your site, run the following commands and then point your");
print("webrowser at " + site_base_url + "/sandbox/");
print("\ncd " + site_name);
print("juice config");
print("juice compile");
print("juice runserver");

