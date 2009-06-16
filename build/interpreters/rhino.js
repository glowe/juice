(function() {
     var cwd = new java.io.File("."),
     new_file = function(path) {
         if (path.charAt(0) !== "/") {
             path = cwd.getCanonicalPath() + "/" + path;
         }
         return new java.io.File(path);
     };

     juice.sys.install_interpreter(
         {basename: function(path) {
              return path.replace(/^.+\//, "");
          },

          canonical_path: function(path) {
              return String((new_file(path)).getCanonicalPath());
          },

          chdir: function(dir) {
              cwd = new_file(dir);
              if (!cwd.exists()) {
                  juice.error.raise("chdir to non-existent dir: " + dir);
              }
          },

          dirname: function(path) {
              var dirname = path.replace(/\/[^\/]+$/, "");
              if (dirname === path) {
                  return "";
              }
              return dirname;
          },

          exit: java.lang.System.exit,

          file_exists: function(path) {
              var file = new_file(path);

              if (!file.exists()) {
                  return false;
              }

              if (file.isDirectory()) {
                  return "dir";
              }

              return "file";
          },

          getenv: function(name) {
              return String(java.lang.System.getEnv(name));
          },

          list_dir: function(path) {
              var files = (new_file(path)).listFiles(), i, list = [];
              // Convert to JS Strings
              for (i = 0; i < files.length; i++) {
                  if (!files[i].isHidden()) {
                      list.push(String(files[i].getName()));
                  }
              }
              return list;
          },

          mkdir: function(path) {
              try {
                  (new_file(path)).mkdir();
              }
              catch (e) {
                  // Ok
              }
          },

          read_file: function(path) {
              var line, contents = [], reader;

              if (juice.sys.file_exists(path) !== "file") {
                  juice.error.raise(path + " is not a file");
              }

              reader = new java.io.BufferedReader(java.io.FileReader(new_file(path)));
              while (!juice.is_null((line = reader.readLine()))) {
                  contents.push(String(line) + "\n");
              }
              return contents.join("");
          },

          rmdir: function(path) {
              (new_file(path))["delete"]();
          },

          sha1: function(plain_text) {
              var byte_array, md, sha1hash, to_hex, HEX_CHARS = "0123456789abcdef";

              to_hex = function(buf) {
                  var chars = [], i;
                  for (i = 0; i < buf.length; ++i)
                  {
                      chars[2 * i] = HEX_CHARS[(buf[i] & 0xF0) >>> 4];
                      chars[2 * i + 1] = HEX_CHARS[buf[i] & 0x0F];
                  }
                  return chars.join("");
              };

              md = java.security.MessageDigest.getInstance("SHA-1");
              sha1hash = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 40);
              byte_array = java.lang.String(plain_text).getBytes("iso-8859-1");
              md.update(byte_array, 0, byte_array.length);
              sha1hash = md.digest();
              return to_hex(sha1hash);
          },

          system: function(cmd) {
              return java.lang.Runtime.getRuntime().exec(cmd).waitFor();
          },

          unlink: function(path) {
              (new_file(path))["delete"]();
          },

          write_file: function(path, contents) {
              var buffer = new java.io.PrintWriter(
                  new java.io.FileWriter(
                      new_file(path)));
              buffer.print(contents);
              buffer.close();
          }
         });

 })();
