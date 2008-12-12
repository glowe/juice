load('juice/tools/build.js');
load('juice/tools/compile.js');

var input_filename, settings;

settings = juice.build.load_settings(arguments);
input_filename = settings.args.shift();

eval(juice.compile.scope_js(juice.compile.read_source_file(input_filename)));
juice.foreach(proj.pages,
             function(name, page) {
                 var deps;
                 deps = juice.compile.read_widget_package_dependencies(page.widget_packages());
                 print(name + ": " + juice.dump(deps));
             });
