(function(juice) {
     var interpreter;

     juice.sys = {};

     juice.sys.install_interpreter = function(impl) {
         impl = juice.spec(impl,
                           {basename:       undefined,
                            canonical_path: undefined,
                            dirname:        undefined,
                            exit:           undefined,
                            file_exists:    undefined,
                            getenv:         undefined,
                            mkdir:          undefined,
                            list_dir:       undefined,
                            read_file:      undefined,
                            rmdir:          undefined,
                            sha1:           undefined,
                            unlink:         undefined,
                            write_file:     undefined});

         juice.sys.basename       = impl.basename;
         juice.sys.canonical_path = impl.canonical_path;
         juice.sys.dirname        = impl.dirname;
         juice.sys.exit           = impl.exit;
         juice.sys.file_exists    = impl.file_exists;
         juice.sys.getenv         = impl.getenv;
         juice.sys.read_file      = impl.read_file;
         juice.sys.rmdir          = impl.rmdir;
         juice.sys.sha1           = impl.sha1;
         juice.sys.unlink         = impl.unlink;

         juice.sys.write_file = function(path, contents, overwrite) {
	     juice.sys.mkdir(juice.sys.dirname(path));
             if (!overwrite && impl.file_exists(path)) {
                 juice.error.raise('write_file failed: file already exists: '+path);
             }
             if (juice.is_array(contents)) {
                 contents = contents.join('\n');
             }
	     return impl.write_file(path, contents);
         };

         juice.sys.rm_rf = function(path) {
             var status = juice.sys.file_exists(path);
             if (status == 'dir') {
                 juice.foreach(juice.sys.list_dir(path, {fullpath:true}),
                               juice.sys.rm_rf);
                 juice.sys.rmdir(path);
             }
             else if (status == 'file') {
                 juice.sys.unlink(path);
             }
         };

         // TODO: fully document list_dir. Note: list_dir does not return
         // hidden files.

         juice.sys.list_dir = function(path, spec) {
	     var filenames;
             spec = juice.spec(spec, {filter_re: null, fullpath: false});

             try {
                 filenames = impl.list_dir(path);
             }
             catch (e) {
                 juice.error.raise("list_dir(" + path + ") failed: " + e);
             }

             filenames = juice.filter(filenames,
                                      function(f) {
                                          if (f[0] == '.') {
                                              return false;
                                          }
                                          if (spec.filter_re) {
                                              return spec.filter_re.test(f);
                                          }
                                          return true;
                                      });
             if (spec.fullpath) {
                 filenames = juice.map(filenames, function(f) { return path+'/'+f; });
             }
	     return filenames.sort();
         };

         juice.sys.mkdir = function(path, mode) {
	     var dir, file_exists_error;

             file_exists_error = function(p) {
		 juice.error.raise('mkdir failed: file already exists: '+p);
             };

	     // Because octal integer literals are deprecated and have been
	     // removed from the ECMA-262, Edition 3 standard, mode must be a
	     // string.

             mode = juice.is_undefined(mode) ? "0777" : String(mode);

	     switch (juice.sys.file_exists(path)) {
             case 'dir':
                 return; // directory already exists
             case 'file':
                 file_exists_error(path);
	     };

	     dir = juice.sys.dirname(path);
             switch (impl.file_exists(dir)) {
             case 'file':
                 file_exists_error(dir);
             case false:
	         juice.sys.mkdir(dir, mode);
                 break;
             };

	     impl.mkdir(path, mode);
         };
     };

     // Determine which interpreter we're running inside of, and based on
     // that, include a file that will install working implementations of
     // the functions in the "impl" dictionary defined above.

    if (sys && sys.v8) {
        interpreter = 'v8';
    }
    else if (typeof File !== 'undefined') {
        print("spidermonkey");
	interpreter = 'spidermonkey';
    }
    else if (typeof java !== 'undefined') {
	interpreter = 'rhino';
    }
    else {
        juice.error.raise('unable to determine interpreter');
    }

     juice.load('build/interpreters/' + interpreter + '.js');

})(juice);
