load('juice/web/modifiers.js');
load('juice/tools/template.js');
load('juice/tools/proj_settings.js');

(function(juice) {
     juice.compile = {};

     juice.compile.template_file = function(filename, macros) {
         var contents, parser;
         macros = macros || {};
         parser = juice.template.parser(macros);
         contents = juice.build.read_file(filename);
         try {
             return parser.parse(contents);
         }
         catch (e) {
             if (e.what === 'syntax_error') {
                 print(
                     juice.template.formatted_error(
                         e,
                         contents,
                         juice.build.canonical_path(filename)));
                 throw e;
             }
             else {
                 throw e;
             }
         }
     };

     juice.compile.read_source_file = function(filename) {
         return juice.build.read_file(filename);
     };

     juice.compile.write_target_file = function(filename, contents) {
         juice.build.write_file(settings.make_htdocs_path(filename), contents, true);
     };

     juice.compile.scope_js = function(contents, extra) {
         extra = extra || '';
         return '(function(juice, proj, jQuery) {\n' +
             contents +
             '\n})(juice, proj, jQuery)' +
             extra;
     };

     // Combines juice.compile.read_source_file and juice.compile_scope_js.
     // Given a list of filenames (which must be js source files), reads each
     // file (using read_source_file), scopes it (using scope_js), and returns
     // the accumulated lines from all the files.

     juice.compile.read_and_scope_source_files = function(filenames) {
         return juice.map(
             filenames,
             function(filename) {
                 return juice.compile.scope_js(juice.compile.read_source_file(filename), ';');
             }).join('\n');
     };

     juice.compile.read_widget_package_dependencies = function(pkgs) {
         var answer, helper, merge;

         merge = function(a, b) {
             return {r: juice.union(a.r, b.r),
                     w: juice.union(a.w, b.w),
                     script_urls: juice.union(a.script_urls, b.script_urls)};
         };

         helper = function(pkg, seen) {
             var deps;

             deps = (function() {
                         load('proj/widgets/' + pkg + '/package');
                         return dependencies;
                     })();

             juice.foreach(deps.w, function(p) {
                              if (seen.hasOwnProperty(p)) {
                                  juice.error.raise('circular_widget_package_dependency', {p1: pkg, p2: p, seen: seen});
                              }
                              seen[p] = true;
                              deps = merge(deps, helper(p, seen));
                              delete seen[p];
                          });

             return deps;
         };

         answer = {r:[], w:[]};
         juice.foreach(juice.is_array(pkgs) ? pkgs : [pkgs],
                      function(pkg) {
                          answer = merge(answer, helper(pkg, {}));
                      });

         return answer;
     };

     return juice;
 })(juice);
