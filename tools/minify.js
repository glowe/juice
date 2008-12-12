load('juice/tools/build.js');
load('juice/ext/tools/jsmin.js');

print(jsmin('', juice.build.read_file(arguments[0]), 3));
