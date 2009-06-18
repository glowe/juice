(function(juice) {
     juice.build.file_log = function(source_files, name) {
         var cache = {}, log, log_filename, sha1_file, sha1_file_cached;

         log_filename = ".juice-file-log-"+name+".json";
         if (juice.sys.file_exists(log_filename)) {
             log = juice.dict_intersect_keys(juice.build.read_file_json(log_filename),
                                             juice.map(source_files, function(f) { return f.path; }));
         }
         else {
             log = {};
         }

         sha1_file = function(filename) {
             if (juice.sys.file_exists(filename) == "file") {
                 return juice.sys.sha1(juice.sys.read_file(filename));
             }
             return undefined;
         };

         sha1_file_cached = function(filename) {
             if (!cache.hasOwnProperty(filename)) {
                 cache[filename] = sha1_file(filename);
             }
             return cache[filename];
         };

         return {
             empty: function() {
                 return juice.keys(log).length === 0;
             },
             has_file_changed: function(filename) {
                 return sha1_file_cached(filename) !== log[filename];
             },
             refresh_file_signature: function(filename) {
                 cache[filename] = sha1_file(filename);
             },
             save: function() {
                 juice.foreach(source_files, function(f) { log[f.path] = sha1_file_cached(f.path); });
                 juice.sys.write_file(log_filename, JSON.stringify(log), true);
             }
         };
     };

     juice.build.unlink_file_logs = function() {
         juice.foreach(juice.sys.list_dir(".", {filter_re: /[.]juice-file-log-.*[.]json$/, fullpath: true}),
                       function(filename) {
                           juice.sys.unlink(filename);
                       });
     };
 })(juice);
