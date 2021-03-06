var docroot, base_url, js_base_url, options, program_options, po;

program_options = juice.program_options(
    {"cd=DIR": ["Change to DIR before doing anything.", "."],
     "help": "Display this message."});

po = program_options.parse_arguments(argv);
options = po.options;
juice.foreach(po.unconsumed, function(k) { explicit_targets[k] = true; });
juice.sys.chdir(options.cd);

juice.build.handle_help(options.help, "runserver", "Runs a standalone webserver for a site.");

juice.build.config.load();
docroot     = juice.build.target_file_path('');
base_url    = juice.url.make(juice.build.site_settings().base_url);
js_base_url = juice.url.make(juice.build.site_settings().js_base_url);

juice.sys.system(juice.path_join(juice.home(), "tools/runserver.py ") +
                 [docroot,
                  base_url.host, base_url.port,
                  js_base_url.host, js_base_url.port].join(" "));
