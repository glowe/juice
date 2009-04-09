(function(juice) {

     var conf_db = {},
     config_filename = '.juice-config.json';

     juice.build.config = {

         // Manipulators.

         set_lib_paths: function(p) {
             conf_db.lib_paths = p;
         },
         set_lint_juice: function(b) {
             conf_db.lint_juice = !!b;
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
                                   lint_juice: false,
                                   site_settings_path: undefined});
             juice.build.eval_file(juice.build.config.site_settings_path());
         }
     };

 })(juice);
