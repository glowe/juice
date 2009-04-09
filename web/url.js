(function(juice) {

     var
     build_query_string,
     canonicalize_path,
     lib,
     parse_location,
     parse_url;

     juice.url = lib = {};

     parse_url = function(url) {
         var result, answer;

         result = /^(?:([a-z]+):)\/\/([a-z\d.\-]+)?(?::(\d+))?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/i.exec(url);
         if (!result) {
             return null;
         }

         answer = {
             url:    result[0],
             scheme: result[1],
             host:   result[2],
             port:   result[3],
             path:   result[4],
             query:  result[5],
             hash:   result[6],
             args:   {}
         };

         if (answer.query) {
             answer.args =
                 juice.pairs_to_dict(
                     juice.map(answer.query.split('&'),
                              function(s) {
                                  var kv = s.split('=');
                                  return [kv[0], unescape(kv[1])];
                              }));
         }

         answer.base = answer.scheme + '://' +
             (answer.host ? answer.host : '') +
             (answer.port ? (':' + answer.port) : '');

         return answer;
     };

     build_query_string = function(args) {
         return juice.map_dict(args, function(k, v) { return k + '=' + escape(v); }).join('&');
     };

     canonicalize_path = function(path) {
         if (path) {
             if (/\/[^\/.]+$/.test(path)) {
                 path += '/';
             }
             if (path.charAt(path.length-1) === '/') {
                 path += 'index.html';
             }
         }
         return path;
     };

     parse_location = function(location) {
         var parts = parse_url(location);
         parts.path = canonicalize_path(parts.path);
         return parts;
     };

     lib.request = function() {
         return parse_location(window.location);
     };

     lib.make = function(spec) {
         var that, parts;
         if (!juice.is_object(spec)) {
             spec = parse_url(spec);
         }

         that = juice.spec(spec, {base: "",
                                  path: "",
                                  args: {}});

         if (juice.is_undefined(that.base)) {
             juice.error.raise("base arg for url was undefined");
         }

         // Normalize that.base and that.path
         that.base = that.base.replace(/\/+$/, "");
         that.path = "/" + that.path.replace(/^\/+/, "");

         that.to_string = function() {
             var query = build_query_string(that.args || {});
             return (that.base || site.settings.base_url) + that.path +
                 (query ? ('?' + query) : "");
         };

         that.join_path = function(s) {
             return lib.make({base: that.base,
                              path: juice.path_join(that.path, s),
                              args: that.args});
         };

         that.toString = that.to_string;

         that.redirect = function() {
             window.location = that.to_string();
         };

         return that;
     };


     lib.reload_current = function() {
         window.location.reload();
     };

 })(juice);
