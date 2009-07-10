(function(juice) {
     var lint = function(filename) {
         var arrow, contents;
         arrow = function(column) {
             var a = [], j;
             for (j = 0; j < column; j++) {
                 a.push('.');
             }
             a.push('^');
             return a.join('');
         };

         contents = juice.sys.read_file(filename);

         if (!JSLINT(contents,
                     {adsafe: false,
                      bitwise: true,
                      browser: true,
                      cap: false,
                      css: true,
                      debug: true,
                      eqeqeq: false,
                      evil: true,
                      forin: true,
                      fragment: true,
                      laxbreak: false,
                      nomen: false,
                      on: true,
                      onevar: true,
                      passfail: false,
                      plusplus: false,
                      regexp: false,
                      rhino: false,
                      undef: true,
                      safe: false,
                      sidebar: false,
                      strict: false,
                      sub: false,
                      white: false,
                      widget: false}))
         {
             // For some reason JSLINT.errors contains null values
             return juice.map(juice.filter(JSLINT.errors),
                              function(e) {
                                  var origin = juice.build.transform_target_to_source_location(contents, e.line);
                                  if (origin) {
                                      e.filename = origin.filename;
                                      e.line = origin.line;
                                  }
                                  return '"' + e.reason + '" in file ' + e.filename + ' at line ' + (e.line + 1) +
                                      ' character ' + e.character + "\n" + e.evidence + "\n" + arrow(e.character) + "\n\n";
                              });
         }
         return [];
     };

     juice.build.lint_target_js = function(file_log) {
         print("Linting javascript...");
         juice.foreach(file_log.files(),
                       function(f) {
                           var errors;
                           if (file_log.has_file_changed(f.path)) {
                               errors = lint(f.path);
                               if (errors.length) {
                                   juice.foreach(errors, function(e) { print(e); });
                                   juice.build.fatal("JSLINT failed. Aborting.");
                               }
                           }
                       });
     };
 })(juice);
