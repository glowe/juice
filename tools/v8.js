(function(juice) {
     juice.build.install_interpreter =
         function(impl) {
             impl.getenv = function(name) {
                 return getenv(name);
             };

             impl.dirname = function(path) {
                 return dirname(path);
             };

             impl.basename = function(path) {
                 return basename(path);
             };

             impl.canonical_path = function(filename) {
                 return realpath(filename);
             };

             impl.read_file = function(path) {
                 return read_file(path);
             };

             impl.write_file = function(path, contents) {
                 impl.mkdir(impl.dirname(path));
                 return write_file(path, contents);
             };

             impl.ls = function(path) {
                 return ls(path);
             };

             impl.mkdir = function(path, mode) {
                 mode = juice.is_undefined(mode) ? '0777' : String(mode);
                 mkdir(dir + '/' + basename(path), mode);
             };
         };
 })(juice);
