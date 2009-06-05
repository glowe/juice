(function(juice) {

     juice.namespace = {

         make: function(spec) {
             var string;

             spec = juice.spec(spec, {lib_name: undefined,
                                      pkg_type: undefined,
                                      pkg_name: undefined});

             string = juice.values(spec).join(".");

             return {
                 lib_name: spec.lib_name,
                 pkg_type: spec.pkg_type,
                 pkg_name: spec.pkg_name,

                 toString: function() {
                     return string;
                 },

                 contains: function(name) {
                     return juice.mhas(site.lib, spec.lib_name, spec.pkg_type, spec.pkg_name, name);
                 },

                 def: function(name, value) {
                     juice.mdef(site.lib, value, spec.lib_name, spec.pkg_type, spec.pkg_name, name);
                 },

                 get: function(name) {
                     return juice.mget(site.lib, spec.lib_name, spec.pkg_type, spec.pkg_name, name);
                 },

                 qualify: function(name) {
                     return string + "." + name;
                 }
             };
         },

         parse: function(string) {
             var parts = string.split(".");
             return this.make({lib_name: parts[0],
                               pkg_type: parts[1],
                               pkg_name: parts[2]});
         }

     };

 })(juice);

