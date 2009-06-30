(function(juice) {

     // A namespace is a period-separated list of names. The list
     // may be 0-4 elements long.
     //
     // The first element in the namespace refers to the library;
     // the second element refers to the package type; the third element
     // refers to the package name; and the fourth element refers to the function.
     //

     juice.namespace = {

         // Parses a period-separated namespace and returns a
         // namespace object.
         parse: function(string) {
             return this.make.apply(this, string.split("."));
         },

         // Accepts a list of namespace components and returns a namespace object.
         // For example:
         //     var ns = juice.namespace(["foo", "rpcs", "bar", "baz"]);
         //     ns.lib_name == "foo";
         //     ns.pkg_type == "rpcs";
         //     ns.pkg_name == "bar";
         //     ns.fn_name  == "baz";
         make: function() {
             var fn_name, lib_name, parts, pkg_type, pkg_name;

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

                 // The library name; undefined if the namespace
                 // doesn't represent a library (i.e., an empty
                 // namespace).
                 lib_name: lib_name,


                 // The package type; undefined if the namespace
                 // is a single-level namespace.
                 pkg_type: pkg_type,

                 // The package name; undefined if the namespace is a
                 // 2-level namespace.
                 pkg_name: pkg_name,

                 // The function name; undefined if the namespace is a
                 // 3-level namespace.
                 fn_name: fn_name,

                 // Asserts that the specified namespace exists.
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

                 // Returns an array of namespace parts.
                 split: function() {
                     return parts;
                 },

                 // Returns the string representation of the namespace.
                 toString: function() {
                     return parts.join(".");;
                 },

                 // Tests whether the namespace contains the name.
                 contains: function(name) {
                     return juice.mhas(site.lib, parts, name);
                 },

                 // Defines the name within the namespace with a value.
                 // The following code sets foo.bar.baz.bash = true:
                 //   juice.namespace.parse("foo.bar.baz").def("bash", true)
                 def: function(name, value) {
                     juice.mdef(site.lib, value, parts, name);
                 },

                 // Returns the value of name within the namespace.
                 get: function(name) {
                     return juice.mget(site.lib, parts, name);
                 },

                 // Returns a further qualfied namespace. For example,
                 // juice.namespace.parse("foo.bar").qualify("baz") returns
                 // the namespace foo.bar.baz.
                 qualify: function(name) {
                     return juice.namespace.make.apply(this, parts.concat(name));
                 },

                 // Unqualifies a namespace. For example,
                 // juice.namespace.parse("foo.bar").unqualify() returns
                 // the namespace foo.
                 unqualify: function() {
                     return juice.namespace.make.apply(this, parts.slice(0, parts.length-1));
                 }
             };
         }
     };
 })(juice);
