(function(juice) {
     juice.build.install_interpreter =
         function(impl) {
             impl.getenv = function(name) {
                 return environment[name];
             };

             impl.dirname = function(path) {
                 return new File(path).parent;
             };

             impl.basename = function(path) {
                 return new File(path).name;
             };

             impl.canonical_path = function(filename) {
                 return new File(filename).path;
             };

             impl.read_file = function(path) {
                 var f, lines;
                 f = new File(path);
                 try {
                     f.open('read');
                     lines = f.readAll();
                     f.close();
                     return lines.join('\n');
                 }
                 catch (e) {
                     juice.error.raise('io_error', {path: path, e: e});
                 }
                 return undefined;
             };

             impl.write_file = function(path, contents) {
                 var buffer, f;
                 f = new File(path);
                 if (f.exists) {
                     f.remove();
                 }
                 f.open('write,create', 'text');
                 f.write(contents);
                 f.close();
             };

             impl.ls = function(path) {
                 var list;
                 list = (new File(path)).list();

                 if (list === null) {
                     juice.error.raise({what: 'path_not_directory', path: path});
                 }

                 return juice.map(list, function(f) { return f.name; });
             };

             impl.file_exists = function(path) {
                 return (new File(path)).exists;
             };

             impl.is_dir = function(path) {
                 return (new File(path)).isDirectory;
             };

             impl.is_dir = function(path) {
                 return (new File(path)).isDirectory;
             };

             impl.mkdir = function(path, mode) {
                 if (!juice.is_undefined(mode)) {
                     juice.error.raise('unsupported', {what: 'mode supplied'});
                 }
                 (new File(impl.dirname(path))).mkdir(impl.basename(path));
             };
         };
 })(juice);
