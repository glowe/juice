(function(juice, site, jQuery) {
     var current_lib_name;

     juice.util = {

         define: function(name, fn) {
             var util = juice.mget(site.lib, current_lib_name, 'util');

             if (util[name]) {
                 juice.error.raise('util already defined', {lib_name: lib_name, name: name});
             }

             util[name] = fn;
         },

         define_package: function(lib_name, constructor) {
             if (current_lib_name) {
                 juice.error.raise('nested utility package: ' + lib_name);
             }
             current_lib_name = lib_name;
             juice.mdef(site.lib, {}, lib_name, 'util');
             constructor(juice, site, jQuery);
             current_lib_name = null;
         }
     };

     // The juice system calls juice.util.loading when it's working in the
     // background--typically, this means there are one or more outstanding
     // rpcs in progress. By default, it just turns the cursor into the
     // browser's default "working" animation and returns a function that,
     // when called, indicates the work being done by the caller is finished.
     //
     // Example usage:
     //
     //     var call_when_finished = juice.util.loading();
     //     setTimeout(function() {
     //                    call_when_finished();
     //                    // ...
     //                },
     //                2000); // simulate an asychronous call
     //
     // Note: sites may override this function by simply setting
     // juice.util.loading to a different function, but it must conform to
     // this interface.

     (function() {
          var num_outstanding_loads = 0;
          juice.util.loading = function() {
              ++num_outstanding_loads;
              jQuery("body").attr("style", "cursor: wait");
              return function() {
                  num_outstanding_loads = Math.max(num_outstanding_loads-1, 0);
                  if (num_outstanding_loads === 0) {
                      jQuery("body").attr("style", "cursor: auto");
                  }
              };
          };
      })();

 })(juice, site, jQuery);
