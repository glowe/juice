(function(juice) {

     var config = {},
     config_filename = '.juice-config.json';

     juice.build.set_lib_paths = function(p) {
         config.lib_paths = p;
     };
     juice.build.set_site_settings_path = function(p) {
         config.site_settings_path = p;
     };
     juice.build.set_should_lint_juice = function(b) {
         config.should_lint_juice = !!b;
     };
     juice.build.site_settings_path = function() {
         return config.site_settings_path;
     };
     juice.build.lib_paths = function() {
         return config.lib_paths;
     };
     juice.build.should_lint_juice = function() {
         return config.should_lint_juice;
     };
     juice.build.save_config = function() {
         juice.sys.write_file(config_filename, JSON.stringify(config), true);
     };
     juice.build.load_config = function() {
         config = juice.build.read_file_json(config_filename);
         juice.build.eval_file(config.site_settings_path);
     };
 })(juice);
