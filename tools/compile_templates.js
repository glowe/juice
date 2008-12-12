load('juice/tools/build.js');
load('juice/tools/template.js');

var
context_var_name,
get_canonical_path,
get_template_name,
lhs,
output,
parser,
settings,
target_filename,
templates;

get_template_name = function(filename) {
    return juice.build.basename(filename).replace('.html', '');
};

settings = juice.build.load_settings(arguments);
lhs = settings.args.shift();
target_filename = settings.args.shift();

load(juice.proj_settings.macros_filename());
parser = juice.template.parser(macros);
templates = {};
juice.foreach(settings.args,
             function(source_filename) {
                 // Get rid of surrounding whitespace (e.g., trailing new lines).
                 var file_contents, template_name;
                 template_name = get_template_name(source_filename);
                 try {
                     file_contents = juice.build.read_file(source_filename).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                     templates['_' + template_name] = parser.parse_src(file_contents, 'templates._');
                     templates[template_name] = 'function(_o) { return function() { return templates._' + template_name + '(_o); }; }';
                 }
                 catch (e) {
                     if (e.info && e.info.what === 'syntax_error') {

                         print(juice.template.formatted_error(e, file_contents, juice.build.canonical_path(source_filename)));
                         quit(2);
                     }
                     else {
                         throw e;
                     }
                 }
             });

output = ' ';
if (juice.keys(templates).length > 0) {
    output =
        lhs + ' = { ' +
        juice.map_dict(templates,
                      function(k, v) {
                          return k + ': ' + v;
                      }).join(',\n') +
        '};';
}

juice.build.write_file(target_filename, output);
