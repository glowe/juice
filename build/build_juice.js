(function(juice){
     juice.build.compile_juice_web = function(all_files) {
         var files, templates, lines = [];
         files = juice.filter(all_files,
                              function(source_file) {
                                  return source_file.target_type === "juice_web";
                              });

         files = juice.group_by(files, function(file) { return file.category; });

         templates = juice.build.compile_templates(
             juice.map(files.template,
                       function(source_file) {
                           return source_file.path;
                       }));

         lines.push('(function(jQuery) {', 'var templates = ' + templates + ";");
         lines = lines.concat(juice.map(files.js,
                                        function(source) {
                                            return juice.sys.read_file(source.path);
                                        }));
         lines.push('})(jQuery);');
         juice.build.write_final_file(
             'js/juice-web.js',
                 lines.join("\n"));
     };

     juice.build.compile_juice_ext_web = function(all_files) {
         var files = juice.filter(all_files,
                                  function(source_file) {
                                      return source_file.target_type === "juice_ext_web";
                                  });

         juice.build.write_final_file(
             'js/juice-ext.js',
             juice.map(files,
                       function(source) {
                           return juice.sys.read_file(source.path);
                       }).join("\n"));
     };
 })(juice);
