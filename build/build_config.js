(function(juice) {

     var conf_db = {},
     config_filename = '.juice-config.json',
     spec = {
         lib_paths: undefined,
         lint_juice: false,
         minify: false,
         mock_rpcs_by_default: false,
         rpc_mocking: false,
         site_settings_path: undefined
     };

     conf_db = juice.copy_object(spec);

     juice.build.config = {

         // Manipulators.

         set_lib_paths: function(p) {
             conf_db.lib_paths = p;
         },
         set_lint_juice: function(b) {
             conf_db.lint_juice = !!b;
         },
         set_minify: function(b) {
             conf_db.minify = !!b;
         },
         set_mock_rpcs_by_default: function(b) {
             conf_db.mock_rpcs_by_default = !!b;
         },
         set_rpc_mocking: function(b) {
             conf_db.rpc_mocking = !!b;
         },
         set_site_settings_path: function(p) {
             conf_db.site_settings_path = p;
         },

         // Accessors.

         lib_paths: function() {
             return conf_db.lib_paths;
         },
         lint_juice: function() {
             return conf_db.lint_juice;
         },
         minify: function() {
             return conf_db.minify;
         },
         mock_rpcs_by_default: function() {
             return conf_db.mock_rpcs_by_default;
         },
         rpc_mocking: function() {
             return conf_db.rpc_mocking;
         },
         site_settings_path: function() {
             return conf_db.site_settings_path;
         },

         // Saving and loading.

         save: function() {
             juice.sys.write_file(config_filename, JSON.stringify(conf_db), true);
         },
         load: function() {
             try {
                 conf_db = juice.spec(juice.build.read_file_json(config_filename), spec);
                 juice.build.eval_file(juice.build.config.site_settings_path());
             }
             catch (e) {
                 juice.build.fatal("Unable to load build configuration. Perhaps you need to run \"juice config\"?");
             }
         }
     };

 })(juice);
