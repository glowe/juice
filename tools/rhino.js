(function(juice) {
     juice.build.install_interpreter =
         function(impl) {
             impl.getenv = function(name) {
                 return java.lang.System.getenv().get(name);
             };

             impl.dirname = function(path) {
                 return (new java.io.File(path)).getParent();
             };

             impl.basename = function(path) {
                 return (new java.io.File(path)).getName();
             };

             impl.canonical_path = function(filename) {
                 return new java.io.File(filename).getCanonicalPath();
             };

             impl.read_file = function(path) {
                 return readFile(path);
             };

             impl.write_file = function(path, contents) {
                 var buffer = new java.io.PrintWriter(new java.io.FileWriter(path));
                 buffer.print(String(contents));
                 buffer.close();
             };

             impl.ls = function(path) {
                 var list;
                 list = (java.io.File(path)).list();

                 if (list === null) {
                     juice.error.raise('path_not_directory', {path: path});
                 }

                 return list.map(String);
             };

             impl.mkdir = function(path, mode) {
                 if (!juice.is_undefined(mode)) {
                     juice.error.raise('unsupported', {what: 'mode supplied'});
                 }
                 return (new java.io.File(path)).mkdir();
             };

             impl.file_exists = function(path) {
                 return (new java.io.File(path)).exists();
             };

             impl.is_dir = function(path) {
                 return (new java.io.File(path)).isDirectory();
             };
         };
 })(juice);
