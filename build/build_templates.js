(function(juice) {

     // Reads a template file and returns the corresponding source
     // code for a template function as a string.

     juice.build.template_file_to_src = function(filename, options) {
         var contents, macros, parser;
         options = juice.spec(options, {macros: null,
                                        templates_prefix: null});

         macros = options.macros || juice.build.read_file_json("macros.json");
         parser = juice.template.parser(macros);

         // Eliminate surrounding whitespace
         contents = juice.sys.read_file(filename).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
         return parser.parse_src(contents, options.templates_prefix);
     };

     juice.build.compile_templates = function(template_filenames) {
         var
         context_var_name,
         get_template_name,
         macros,
         parser,
         templates;

         get_template_name = function(filename) {
             return juice.sys.basename(filename).replace('.html', '');
         };

         macros = juice.build.read_file_json("macros.json");
         templates = {};
         juice.foreach(template_filenames,
                       function(source_filename) {
                           var contents, template_name = get_template_name(source_filename);
                           try {
                               // Get rid of surrounding whitespace (e.g., trailing new lines).
                               templates['_' + template_name] =
                                   juice.build.template_file_to_src(source_filename,
                                                                    {macros: macros,
                                                                     templates_prefix: 'templates._'});
                               templates[template_name] =
                                   'function(_o) { return function() { return templates._' + template_name + '(_o); }; }';
                           }
                           catch (e) {
                               if (e.info && e.info.what === 'syntax_error') {
                                   juice.error.raise(
                                       juice.template.formatted_error(e,
                                                                      file_contents,
                                                                      juice.sys.canonical_path(source_filename)));
                               }
                               else {
                                   throw e;
                               }
                           }
                       });

         return "{" +
             juice.map_dict(templates,
                            function(template_name, template_src) {
                                return '"' + template_name + '":' + template_src;
                            }).join(",") + "}";
     };

     juice.build.compile_template = function(filename, options) {
         var src;
         try {
             src = juice.build.template_file_to_src(filename, options);
         }
         catch (e) {
             // FIXME:
             src = juice.sys.read_file(filename);
             juice.build.fatal(juice.template.formatted_error(e, src, filename));
         }
         return eval(src);
     };

 })(juice);
