(function(juice) {
     // Tells juice to enable or disable mocking for certain rpcs.
     // `what` may refer to a specific rpc (e.g.
     // "my_library.rpcs.foo_package.the_rpc"), an rpc package (e.g.
     // "my_library.rpcs.foo_package"), or even an entire library
     // (e.g. "my_library" or, equivalently, "my_library.rpcs"). You
     // may also refer to all libraries by setting `what` to "*" or
     // an empty string.

     juice.namespace = {
         make: function(string) {
             var lib_name, pkg_type, pkg_name, fn_name, parts = string.split(".");

             if (parts.length > 0) {
                 lib_name = parts[0];
                 if (site.libs.hasOwnProperty(lib_name)) {
                     juice.error.raise("Unrecognized library: " + lib_name);
                 }
             }

             if (parts.length > 1) {
                 pkg_type = parts[1];
                 if (site.libs[lib_name].hasOwnProperty(pkg_type)) {
                     juice.error.raise("Unrecognized package type: " + pkg_type);
                 }
             }

             if (parts.length > 2) {
                 pkg_name = parts[2];
                 if (site.libs[lib_name][pkg_type].hasOwnProperty(pkg_name)) {
                     juice.error.raise("Unrecognized package name: " + pkg_name);
                 }
             }

             if (parts.length > 3) {
                 fn_name = parts[3];
             }

             if (parts.length > 4) {
                 juice.error.raise("Namespace too deep: " + string);
             }

             return {
                 lib_name: lib_name,
                 pkg_type: pkg_type,
                 pkg_name: pkg_name,
                 fn_name: fn_name,

                 toString: function() {
                     return string;
                 },

                 contains: function(name) {
                     return juice.mhas(site.lib, parts, name);
                 },

                 def: function(name, value) {
                     juice.mdef(site.lib, value, parts, name);
                 },

                 get: function(name) {
                     return juice.mget(site.lib, parts, name);
                 },

                 qualify: function(name) {
                     return make(string + "." + name);
                 },

                 unqualify: function() {
                     return make(parts.slice(0, parts.length-1));
                 }
             };
         }
     };
 })(juice);

