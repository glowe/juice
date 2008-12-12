load('juice/tools/build.js');
load('juice/tools/compile.js');
var args, filenames, target_filename, settings;

settings = juice.build.load_settings(arguments);
target_filename = settings.args.shift();
filenames = settings.args;

var all_lines = [];
juice.foreach(filenames,
             function(filename) {
                 all_lines = all_lines.concat(juice.compile.read_source_file(filename));
             });
juice.compile.write_target_file(target_filename, all_lines);
