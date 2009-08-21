(function(juice, jQuery) {

     // Functions for using juice in a "lite" (non-hosted) environment.
     juice.lite = {
         init: function(fn) {
             try {
                 fn();
                 juice.event.publish("juice.ready");
             }
             catch (e) {
                 juice.error.handle(e);
                 return;
             }

             juice.event.subscribe(undefined, "juice.rpc_failure",
                                   function(event) {
                                       juice.error.raise("backend failure: "+juice.dump(event));
                                   });
             juice.rpc.start();
         },

         install_widget: function(widget, selector) {
             jQuery(selector).append(widget.unsafe_render());
             widget.fire_domify();
         }
     };
 })(juice, jQuery);
