juice.sys.install_interpreter(
    {basename: sys.os.basename,
     canonical_path: sys.os.realpath,
     dirname: sys.os.dirname,
     exit: quit,
     file_exists: function(path) {
         var file_info;
         try {
             file_info = sys.os.stat(path);
         }
         catch (e) {
             if ((e.errno == sys.os.errno.ENOENT) || e.errno != sys.os.errno.ENODIR) {
                 return false;
             }
             throw e;
         }
         if (sys.os.S_ISDIR(file_info.st_mode)) {
             return 'dir';
         }

         if (sys.os.S_ISREG(file_info.st_mode)) {
             return 'file';
         }
         return juice.error.raise("Unknown file type");
     },
     getenv: sys.os.getenv,
     read_dir: sys.os.listdir,
     mkdir: sys.os.mkdir,
     read_file: function(path) {
         var contents = [], file;
         if (juice.sys.file_exists(path) !== "file") {
             throw path + " is not a file";
         }
         file = sys.os.fopen(path, "r");
         while (!sys.os.feof(file)) {
             contents.push(sys.os.fread(file, 1024));
         }
         return contents.join('');
     },
     rmdir: sys.os.rmdir,
     sha1: sys.crypt.sha1,
     unlink: sys.os.unlink,
     write_file: function(path, contents) {
         var file = sys.os.fopen(path, "r");
         try {
             fwrite(file, contents);
         }
         catch (e) {
             fclose(file);
         }
     }
    });
