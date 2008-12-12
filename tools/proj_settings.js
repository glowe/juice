(function(juice) {
     var my = {};

     juice.proj_settings = {

         set_site_base_url: function(url) {
             my.site_base_url = url;
         },
         site_base_url: function() {
             return my.site_base_url;
         },

         set_js_base_url: function(url) {
             my.js_base_url = url;
         },
         js_base_url: function() {
             return my.js_base_url;
         },

         set_rpc_proxies_filename: function(path) {
             my.rpc_proxies_filename = path;
         },
         rpc_proxies_filename: function() {
             return 'proj/rpcs/' + my.rpc_proxies_filename;
         },

         set_macros_filename: function(path) {
             my.macros_filename = path;
         },
         macros_filename: function() {
             return 'proj/macros/' + my.macros_filename;
         },

         dump: function() {
             return juice.dump(my);
         }

     };

 })(juice);
