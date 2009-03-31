 var jQuery = {};

load('juice/web/prelude.js');
load('juice/web/error.js');
load('juice/web/event.js');
load('juice/web/layout.js');
load('juice/web/modifiers.js');
load('juice/web/page.js');
load('juice/web/rpc.js');
load('juice/web/url.js');
load('juice/web/widget.js');
load('juice/tools/proj_settings.js');

(function(juice) {
     var impl, interpreter_filename, interpreter_tests;

     // Interface to interpreter
     impl = {
         getenv: function(name) {
             juice.error.raise('getenv_not_implemented');
         },
         dirname: function(path) {
             juice.error.raise('dirname_not_implemented');
         },
         basename: function(path) {
             juice.error.raise('basename_not_implemented');
         },
         canonical_path: function(filename) {
             juice.error.raise('canonical_path_not_implemented');
         },
         read_file: function(path) {
             juice.error.raise('read_file_not_implemented');
         },
         write_file: function(path, contents) {
             juice.error.raise('write_file_not_implemented');
         },
         ls: function(path) {
             juice.error.raise('ls_not_implemented');
         },
         file_exists: function(path) {
             juice.error.raise('file_exists_not_implemented');
         },
         is_dir: function(path) {
             juice.error.raise('is_dir_not_implemented');
         },
         mkdir: function(path, mode) {
             juice.error.raise('mkdir_not_implemented');
         }
     };

     juice.build = {
         load_settings: function(prog_args) {
             var args, filename, bs;
             args = juice.args(prog_args);
             filename = args.shift();

             try {
                 load(filename);
             }
             catch (e) {
                 juice.error.raise("Can't load build settings file: " +filename);
             }

             bs = juice.build_settings;
             bs.args = args;
             bs.make_build_path = function(p) {
                 var prefix = bs.build_dir + '/';
                 return prefix + p.replace(prefix, ''); // FIXME: pathjoin
             };
             bs.make_htdocs_path = function(p) {
                 var prefix = bs.build_dir + '/htdocs/';
                 return prefix + p.replace(prefix, ''); // FIXME: pathjoin
             };

             bs.make_htdocs_jspath = function(p) {
                 var prefix = bs.build_dir + '/htdocs/js/';
                 return prefix + p.replace(prefix, ''); // FIXME: pathjoin
             };

             load(bs.proj_filename);
             return bs;
         },

         getenv: function(name) {
	      return impl.getenv(name);
	 },

	 dirname: function(path) {
	      return impl.dirname(path);
	 },

	 basename: function(path) {
	     return impl.basename(path);
	 },

	 canonical_path: function(filename) {
	      return impl.canonical_path(filename);
	 },

	 read_file: function(path) {
	     return impl.read_file(path);
	 },

	 write_file: function(path, contents, overwrite) {
	     juice.build.mkdir(juice.build.dirname(path));
             if (!overwrite && impl.file_exists(path)) {
                 juice.error.raise('overwrite_file', {path: path});
             }
             if (juice.is_array(contents)) {
                 contents = contents.join('\n');
             }
	     return impl.write_file(path, contents);
	 },

	 ls: function(path, filter_re) {
	     var visible_files = juice.filter(impl.ls(path),
					     function(f) {
						 return (/^[^.]/).test(f) && (!filter_re || filter_re.test(f));
					     });
	     return juice.map(visible_files,
			     function(f) { return path + '/' + f; }).sort();
	 },

	 mkdir: function(path, mode) {
	     var dir, stat;

	     // Because octal integer literals are deprecated and have been
	     // removed from the ECMA-262, Edition 3 standard, mode must be a
	     // string.
	     if (!juice.is_undefined(mode)) {
		 mode = String(mode);
	     }

	     // Base case
	     if (impl.file_exists(path)) {
		 if (impl.is_dir(path)) {
		     return;
		 }
		 else {
		     juice.error.raise('overwrite_file', {path: path});
		 }
	     }

	     dir = juice.build.dirname(path);
	     if (!impl.file_exists(dir)) {
		 juice.build.mkdir(dir, mode);
	     }
	     else if (!impl.is_dir(dir)) {
		 juice.error.raise('overwrite_file', {path: dir});
	     }
	     impl.mkdir(path, mode);
	 }
     };

     //
     // Determine which interpreter we're running inside of, and based on
     // that, include a file that will install working implementations of the
     // functions in the "impl" dictionary defined above.
     //

     juice.build.install_interpreter = function(impl) {
         juice.error.raise('install_interpreter_not_implemented');
     };

     interpreter_tests = {
         v8: function() {
             return typeof v8 === 'function' && v8() === 'v8';
         },
         spidermonkey: function() {
             return typeof File !== 'undefined';
         },
         rhino: function() {
             return typeof java !== 'undefined';
         }
     };

     if (interpreter_tests.v8()) {
         interpreter_filename = 'v8.js';
     }
     else if (interpreter_tests.spidermonkey()) {
	 interpreter_filename = 'spidermonkey.js';
     }
     else if (interpreter_tests.rhino()) {
	 interpreter_filename = 'rhino.js';
     }
     else {
         juice.error.raise('unrecognized_interpreter');
     }

     load('juice/tools/' + interpreter_filename);
     juice.build.install_interpreter(impl);

     return juice;
 })(juice);
