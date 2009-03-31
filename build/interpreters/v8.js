// Give us stack traces in v8
(function() {
     var format_frame = function(frame) {
         var func, result = '';
         func = frame.func();

         if (func.resolved()) {
             if (func.script()) {
                 if (func.script().name()) {
                     result += func.script().name();
                 } else {
                     result += '[unnamed]';
                 }
                 if (!frame.isDebuggerFrame()) {
                     var location = frame.sourceLocation();
                     result += ' line ';
                     result += !(typeof(location) === 'undefined') ? (location.line + 1) : '?';
                     result += ' column ';
                     result += !(typeof(location) === 'undefined') ? (location.column + 1) : '?';
                 }
             } else {
                 result += '[no source]';
             }
         } else {
             result += '[unresolved]';
         }

         return result;
     };
     sys.add_debug_event_listener(
         function(event, exec_state, event_data, data) {
             var i, prop;
             print(event_data.exception());
             if (event == 2) {
                 for (i = 0; i < exec_state.frameCount(); i++) {
                     print(format_frame(exec_state.frame(i)));
                 }
                 print();
             }
         });
 })();

juice.sys.install_interpreter(
    {basename: sys.os.basename,
     canonical_path: function(path) {
         try {
             return sys.os.realpath(path);
         }
         catch (e) {
             e.message += " (" + path + ")";
             return juice.error.raise(e);
         }
     },
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
             juice.error.raise(e.message);
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
     list_dir: sys.os.listdir,
     mkdir: sys.os.mkdir,
     read_file: function(path) {
         var contents = [], file;
         if (juice.sys.file_exists(path) !== "file") {
             juice.error.raise(path + " is not a file");
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
         var file;
         try {
             file = sys.os.fopen(path, "w");
             sys.os.fwrite(file, contents);
             sys.os.fclose(file);
         }
         catch (e) {
             if (file) {
                 sys.os.fclose(file);
             }
             e.message += " when writing to " + path + "";
             juice.error.raise(e);
         }
     }
    });
