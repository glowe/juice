(function(juice) {

     var
     build_query_string,
     canonicalize_path,
     lib,
     path_concat,
     parse_location,
     parse_url;

     juice.url = lib = {};

     path_concat = function(a, b) {
         return a + ((a[a.length-1] === '/' && b[0] === '/') ? b.slice(1) : b);
     };

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

         if (juice.is_object(spec)) {
             that = {base: spec.base || "",
                     path: spec.path || "",
                     args: spec.args || {}};
         }
         else {
             parts = parse_url(spec);
             that = {base: parts.base || "",
                     path: parts.path || "",
                     args: parts.args || {}};
         }

         that.to_string = function() {
             var query = build_query_string(that.args || {});
             return path_concat(that.base || site.settings.base_url, that.path) +
                 (query ? ('?' + query) : "");
         };

         that.append_path = function(s) {
             return lib.make({base: that.base,
                              path: path_concat(that.path, s),
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
