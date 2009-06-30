(function(juice) {

     // A namespace is a period-separated list of names. The list
     // may be 0-4 elements long.
     //
     // The first element in the namespace refers to the library;
     // the second element refers to the package type; the third element
     // refers to the package name; and the fourth element refers to the function.
     //

     juice.namespace = {
         parse: function(string) {
             return this.make.apply(this, string.split("."));
         },

         make: function() {
             var lib_name, parts, pkg_type, pkg_name, fn_name;

             parts = juice.args(arguments);

             if (parts.length > 4) {
                 juice.error.raise("Namespace too deep: " + string);
             }

             if (parts.length > 0) {
                 lib_name = parts[0];
             }

             if (parts.length > 1) {
                 pkg_type = parts[1];
             }

             if (parts.length > 2) {
                 pkg_name = parts[2];
             }

             if (parts.length > 3) {
                 fn_name = parts[3];
             }

             return {
                 lib_name: lib_name,
                 pkg_type: pkg_type,
                 pkg_name: pkg_name,
                 fn_name: fn_name,

                 assert_exists: function() {
                     if (!site.lib.hasOwnProperty(lib_name)) {
                         juice.error.raise("Unrecognized library: " + lib_name);
                     }

                     if (pkg_type && !site.lib[lib_name].hasOwnProperty(pkg_type)) {
                         juice.error.raise("Unrecognized package type: " + pkg_type);
                     }
                     if (pkg_name && !site.lib[lib_name][pkg_type].hasOwnProperty(pkg_name)) {
                         juice.error.raise("Unrecognized package: " + pkg_name);
                     }
                     if (fn_name && !site.lib[lib_name][pkg_type][pkg_name].hasOwnProperty(fn_name)) {
                         juice.error.raise("Unrecognized function: " + fn_name);
                     }
                 },

                 split: function() {
                     return parts;
                 },

                 toString: function() {
                     return parts.join(".");;
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
                     return juice.namespace.make.apply(this, parts.concat(name));
                 },

                 unqualify: function() {
                     return juice.namespace.make.apply(this, parts.slice(0, parts.length-1));
                 }
             };
         }
     };
 })(juice);
