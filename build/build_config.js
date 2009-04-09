(function(juice) {

     var conf_db = {},
     config_filename = '.juice-config.json';

     juice.build.config = {

         // Manipulators.

         set_lib_paths: function(p) {
             conf_db.lib_paths = p;
         },
         set_rpc_mocking_enabled: function(b) {
             conf_db.rpc_mock_enabled = !!b;
         },
         set_lint_juice: function(b) {
             conf_db.lint_juice = !!b;
         },
         set_minify: function(b) {
             conf_db.minify = !!b;
         },
         set_site_settings_path: function(p) {
             conf_db.site_settings_path = p;
         },

         // Accessors.

         lib_paths: function() {
             return conf_db.lib_paths;
         },
         rpc_mocking_enabled: function() {
             return conf_db.rpc_mocking_enabled;
         },
         lint_juice: function() {
             return conf_db.lint_juice;
         },
         minify: function() {
             return conf_db.minify;
         },
         site_settings_path: function() {
             return conf_db.site_settings_path;
         },

         // Saving and loading.

         save: function() {
             juice.sys.write_file(config_filename, JSON.stringify(conf_db), true);
         },
         load: function() {
             conf_db = juice.spec(juice.build.read_file_json(config_filename),
                                  {lib_paths: undefined,
                                   rpc_mock_enabled: true,
                                   lint_juice: false,
                                   minify: false,
                                   site_settings_path: undefined});
             juice.build.eval_file(juice.build.config.site_settings_path());
         }
     };

 })(juice);
