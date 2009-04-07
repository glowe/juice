(function(juice) {
     juice.build.lint_js = function(filename) {
         var arrow = function(column) {
             var a = [], j;
             for (j = 0; j < column; j++) {
                 a.push('.');
             }
             a.push('^');
             return a.join('');
         };

         if (!JSLINT(juice.sys.read_file(filename),
                     {evil: true,
                      forin: true,
                      laxbreak: true,
                      rhino: false,
                      white: false}))
         {
             // For some reason JSLINT.errors contains null values
             return juice.map(juice.filter(JSLINT.errors),
                              function(e) {
                                  return '"' + e.reason + '" in file ' + filename + ' at line '
                                      + (e.line + 1) + ' character ' + e.character + "\n"
                                      + e.evidence + "\n" + arrow(e.character) + "\n\n";
                              });
         }
         return [];
     };
 })(juice);
