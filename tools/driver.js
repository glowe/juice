var argv, juice_home, program;

argv = Array.prototype.slice.apply(arguments, [0]);
juice_home = argv[0];
program = argv[1];
argv = argv.slice(2);

load(juice_home + '/web/prelude.js');
load(juice_home + '/web/error.js');
load(juice_home + '/tools/program_options.js');

// todo: load more juice files required for all tools (etc.)
load(program);
