(function (juice, site) {
     var read_cookie, set_cookie;

     read_cookie = function() {
         var results = document.cookie.match('(^|;) ?' + site.settings.cookie_name + '=([^;]*)(;|$)');
         if (!results) {
             return {};
         }
         return JSON.parse(unescape(results[2]));
     };

     set_cookie = function(value) {
         document.cookie = site.settings.cookie_name + '=' + escape(JSON.stringify(value)) + '; path=/';
     };

     // FIXME: we can cache cookie value if we want
     juice.cookie = {
         get: function(name) {
             var contents = read_cookie();
             return contents[name];
         },
         has: function(name) {
             var contents = read_cookie();
             return contents.hasOwnProperty(name);
         },
         set: function(name, value) {
             var contents = read_cookie();
             contents[name] = value;
             set_cookie(contents);
             return contents;
         },
         remove: function(name) {
             var contents = read_cookie();
             delete contents[name];
             return contents;
         }
     };
 })(juice, site);
