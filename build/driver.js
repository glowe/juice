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
juice.load('web/prelude.js');
juice.load('web/error.js');
juice.load('web/page.js');
juice.load('web/url.js');
juice.load('build/build.js');
juice.load('build/program_options.js');
juice.load('build/sys.js');
juice.load('build/template.js');

load(program);
