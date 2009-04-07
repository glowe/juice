(function(juice) {
     var log_filename = '.juice-file-log.json';

     juice.build.clean = function() {
         juice.sys.unlink(log_filename);
         juice.sys.rm_rf('./build');
     };

     juice.build.file_log = function(source_files) {
         var cache = {}, log, sha1_file;

         if (juice.sys.file_exists(log_filename)) {
             log = juice.dict_intersect_keys(juice.build.read_file_json(log_filename),
                                             juice.map(source_files, function(f) { return f.path; }));
         }
         else {
             log = {};
         }

         sha1_file = function(filename) {
             if (!cache[filename]) {
                 cache[filename] = juice.sys.sha1(juice.sys.read_file(filename));
             }
             return cache[filename];
         };

         return {
             empty: function() {
                 var k;
                 for (k in log) {
                     if (log.hasOwnProperty(k)) {
                         return false;
                     }
                 }
                 return true;
             },
             has_file_changed: function(filename) {
                 return sha1_file(filename) !== log[filename];
             },
             update_file: function(filename) {
                 log[filename] = sha1_file(filename);
             },
             save: function() {
                 juice.sys.write_file(log_filename, JSON.stringify(log), true);
             },
             clear: function() {
                 juice.sys.unlink(log_filename);
                 log = {};
             }
         };
     };
 })(juice);
