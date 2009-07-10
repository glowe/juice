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
                      undef: false,
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
                                  return '"' + e.reason + '" in file ' + filename + ' at line '
                                      + (e.line + 1) + ' character ' + e.character + "\n"
                                      + e.evidence + "\n" + arrow(e.character) + "\n\n";
                              });
         }
         return [];
     };
 })(juice);
