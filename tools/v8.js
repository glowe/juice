(function(juice) {
     juice.build.install_interpreter =
         function(impl) {
             impl.basename = sys.basename;
             impl.canonical_path = sys.realpath;
             impl.dirname = sys.dirname;
             impl.file_exists = sys.file_exists;
             impl.getenv = sys.getenv;
             impl.is_dir = sys.is_dir;
             impl.ls = sys.ls;
             impl.mkdir = function(path, mode) {
                 sys.mkdir(path, juice.is_undefined(mode) ? "0777" : String(mode));
             };
             impl.read_file = sys.read_file;
             impl.write_file = function(path, contents) {
                 sys.mkdir(sys.dirname(path));
                 return sys.write_file(path, contents);
             };
         };
 })(juice);
