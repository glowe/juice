var argv, program;

argv = Array.prototype.slice.apply(arguments, [0]);

(function() {

     var append_path, juice_home, juice_libpath;

     append_path = function(a, b) {
         return b ? (a + '/' + b) : a;
     };

     this.juice = {
         home: function(path) {
             return append_path(juice_home, path);
         },
         libpath: function(path) {
             return append_path(juice_libpath, path);
         },
         load: function(path) {
             load(juice_home + '/' + path);
         }
     };

     juice_home = argv[0];
     juice_libpath = argv[1];
})();

program = argv[2];
argv = argv.slice(3);

juice.load('ext/tools/fulljslint.js');
juice.load('ext/web/json2.js');
juice.load('web/00-prelude.js');
juice.load('web/error.js');
juice.load('web/namespace.js');
juice.load('web/modifiers.js');
juice.load('web/layout.js');
juice.load('web/page.js');
juice.load('web/url.js');
juice.load('build/build.js');
juice.load('build/build_config.js');
juice.load('build/build_file_log.js');
juice.load('build/build_hooks.js');
juice.load('build/build_juice.js');
juice.load('build/build_lint.js');
juice.load('build/build_minify.js');
juice.load('build/build_pages.js');
juice.load('build/build_packages.js');
juice.load('build/build_site.js');
juice.load('build/build_templates.js');
juice.load('build/program_options.js');
juice.load('build/sys.js');
juice.load('build/template.js');

load(program);
