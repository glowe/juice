(function(juice) {
     var appliers = [], categorizers = [], user_source_files = [];

     juice.build.categorize_source_files = function(what, categorizer_fn) {
         var path;
         if (what.lib_name) {
             try {
                 path = juice.build.lib_path(what.lib_name);
             }
             catch (e) {
                 juice.error.raise("Attempting to set categorizer for unrecognized library: " +lib_name);
             }
             path = juice.path_join(path, what.dir);
         }
         else {
             path = juice.path_join('.', what.dir);
         }
         categorizers.push({path:path, fn:categorizer_fn, lib_name:what.lib_name});
     };

     juice.build.find_user_categorized_source_files = function() {

         juice.foreach(categorizers,
                       function(categorizer) {
                           var helper = function(path) {
                               juice.foreach(juice.sys.list_dir(path, {fullpath:true}),
                                             function(filename) {
                                                 var category;
                                                 if (juice.sys.file_exists(filename) == 'dir') {
                                                     helper(filename);
                                                 }
                                                 else if ((category = categorizer.fn(filename))) {
                                                     user_source_files.push(juice.build.source_file(
                                                                                {category: category,
                                                                                 lib_name: categorizer.lib_name,
                                                                                 path: filename,
                                                                                 target_type: 'user'}));
                                                 }
                                             });
                           };
                           helper(categorizer.path);
                       });
         return user_source_files;
     };

     juice.build.apply_to_source_files = function(fn) {
         appliers.push(fn);
     };

     juice.build.run_user_source_file_appliers = function() {
         juice.foreach(appliers,
                       function(applier) {
                           applier(user_source_files);
                       });
     };

 })(juice);
