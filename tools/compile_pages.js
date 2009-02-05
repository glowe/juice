load('juice/tools/build.js');
load('juice/tools/compile.js');

var input_filename, log_path, page_template, parser, settings;

settings = juice.build.load_settings(arguments);
input_filename = settings.args.shift();
log_path = settings.args.shift();

eval(juice.compile.scope_js(juice.compile.read_source_file(input_filename)));

load(juice.proj_settings.macros_filename());
page_template = juice.compile.template_file('juice/tools/templates/page.html', macros);
juice.foreach(proj.pages,
             function(name, page) {
                 var deps, path;

                 path = settings.htdocs_dir;
                 if (page.path_is_dynamic()) {
                     path += '/__' + name + '.html';
                 }
                 else {
                     path += page.path();
                     if (path.charAt(path.length - 1) === '/') {
                         path += 'index.html';
                     }
                 }

                 deps = juice.compile.read_widget_package_dependencies(page.widget_packages());
                 deps.w = juice.union(deps.w, page.widget_packages());
                 deps.script_urls = juice.union(deps.script_urls, page.script_urls());

                 juice.build.write_file(
                     path,
                     page_template({name: name,
                                    title: page.title(),
                                    js_base_url: juice.proj_settings.js_base_url(),
                                    script_urls: deps.script_urls,
                                    stylesheet_urls: page.stylesheet_urls(),
                                    widget_packages: deps.w,
                                    rpc_packages: deps.r}),
                     true);
             });

juice.build.write_file(log_path, (new Date()).toString(), true);
