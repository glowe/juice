/* Define your project specific settings here. */

(function() {
     // Here's an example settings file to get your started.
     var build_url, s;

     build_url = juice.url.make({base: 'http://localhost:8000'});

     s = juice.proj_settings;

     s.set_site_base_url(build_url);
     s.set_js_base_url(build_url.append_path('/js'));
     s.set_rpc_proxies_filename('proxies.js');
     s.set_macros_filename('macros.js');
     juice.page.add_global_stylesheet_url(build_url.append_path('/style/new_proj.css'));
     juice.page.add_global_stylesheet_url(build_url.append_path('/style/jquery-ui-themeroller.css'));
 })();
