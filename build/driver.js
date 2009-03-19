var argv, program;

argv = Array.prototype.slice.apply(arguments, [0]);

(function() {

     var juice_home, juice_libpath;

     this.juice = {
         home: function() {
             return juice_home;
         },
         libpath: function() {
             return juice_libpath;
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

juice.load('web/prelude.js');
juice.load('web/error.js');
juice.load('build/build.js');
juice.load('build/program_options.js');
juice.load('build/sys.js');
load(program);
