load('juice/tools/build.js');
load('juice/tools/compile.js');

var
lines,
settings,
sources,
target_file,
template_file;

settings = juice.build.load_settings(arguments);
target_file = settings.args.shift();
template_file = settings.args.shift();
sources = settings.args;

lines = [];
lines.push('(function() {');

print('Attempting to read from ' + template_file);
lines.push(juice.compile.read_source_file(template_file));


lines = lines.concat(juice.map(sources, juice.compile.read_source_file));
lines.push('})();');

print('Writing to ' + target_file + '\n');
juice.compile.write_target_file(target_file, lines.join('\n'));
