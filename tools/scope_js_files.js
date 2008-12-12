load('juice/tools/build.js');
load('juice/tools/compile.js');
var args, filenames, target_filename, settings;

settings = juice.build.load_settings(arguments);
target_filename = settings.args.shift();
filenames = settings.args;

var all_lines = ['try {'];
juice.foreach(filenames,
             function(filename) {
                 var lines = juice.compile.read_source_file(filename);
                 all_lines = all_lines.concat(juice.compile.scope_js(lines, ';'));
             });
all_lines.push('}', 'catch (e) {', 'juice.error.handle(e);', '}');
juice.compile.write_target_file(target_filename, all_lines);
