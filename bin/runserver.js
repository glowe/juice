var docroot, base_url, js_base_url;

juice.build.config.load();
docroot     = juice.build.final_file_path('');
base_url    = juice.url.make(juice.build.site_settings().base_url);
js_base_url = juice.url.make(juice.build.site_settings().js_base_url);

juice.sys.system(juice.path_join(juice.home(), "tools/runserver.py ") +
                 [docroot,
                  base_url.host, base_url.port,
                  js_base_url.host, js_base_url.port].join(" "));
