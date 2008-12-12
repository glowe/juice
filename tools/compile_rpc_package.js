load('juice/tools/build.js');
load('juice/tools/compile.js');

var
lines,              // this is what we're writing to target_filename
pkg,                // name of the package being built
settings,           // the build settings
source_filenames,   // list of source filenames
target_filename;    // the output filename

settings = juice.build.load_settings(arguments);
pkg = settings.args.shift();
target_filename = settings.args.shift();
source_filenames = settings.args;

lines = ['try {', 'juice.rpc.define_package("' + pkg + '",function(juice,proj,jQuery) {'];
lines = lines.concat(juice.compile.read_and_scope_source_files(source_filenames));
lines = lines.concat(['});', '}', 'catch (e) { juice.error.handle(e); }']);

juice.compile.write_target_file(target_filename, lines);
