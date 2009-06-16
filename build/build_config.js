(function(juice) {

     var conf_db = {},
     config_filename = '.juice-config.json',
     spec = {
         debug: false,
         lib_paths: undefined,
         lint_juice: false,
         minify: false,
         rpc_mocking: false,
         site_settings_path: undefined,
         version_js_urls: false
     };

     conf_db = juice.copy_object(spec);

     juice.build.config = {

         // Manipulators.

         set_debug: function(b) {
             conf_db.debug = !!b;
         },
         set_lib_paths: function(p) {
             conf_db.lib_paths = p;
         },
         set_lint_juice: function(b) {
             conf_db.lint_juice = !!b;
         },
         set_minify: function(b) {
             conf_db.minify = !!b;
         },
         set_rpc_mocking: function(b) {
             conf_db.rpc_mocking = !!b;
         },
         set_site_settings_path: function(p) {
             // Test that the site settings are correct
             try {
                 juice.build.eval_file(p);
                 conf_db.site_settings_path = p;
             }
             catch (e) {
                 print(e);
                 juice.build.fatal("Error in settings file with path: " + p);
             }
         },
         set_version_js_urls: function(b) {
             conf_db.version_js_urls = !!b;
         },

         // Accessors.

         debug: function() {
             return conf_db.debug;
         },
         lib_paths: function() {
             return conf_db.lib_paths;
         },
         lint_juice: function() {
             return conf_db.lint_juice;
         },
         minify: function() {
             return conf_db.minify;
         },
         rpc_mocking: function() {
             return conf_db.rpc_mocking;
         },
         site_settings_path: function() {
             return conf_db.site_settings_path;
         },
         version_js_urls: function() {
             return conf_db.version_js_urls;
         },

         // Saving and loading.

         save: function() {
             juice.sys.write_file(config_filename, JSON.stringify(conf_db), true);
         },
         load: function() {
             try {
                 conf_db = juice.spec(juice.build.read_file_json_unsafe(config_filename), spec);
                 juice.build.eval_file(juice.build.config.site_settings_path());
             }
             catch (e) {
                 print(e);
                 juice.build.fatal("Unable to load build configuration. Perhaps you need to run \"juice config\"?");
             }
         }
     };

 })(juice);
