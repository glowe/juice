(function(juice) {

     var expected_hash, ignore_set_calls;

     juice.history = {

         init: function() {},

         // Updates the session state and the bookmark stored in
         // window.location.hash. This function has no effect if the hash
         // would not change (i.e. it doesn't add to the browser history by
         // modifying the hash to the same value). Also, if we're inside the
         // on_change_handlers functions, calling this function has no effect
         // at all. This protects the application from accidentally adding
         // history when the user hits the back/forward buttons.

         set: function(state) {
             var new_hash;
             if (ignore_set_calls) {
                 return;
             }
             new_hash = '#' + JSON.stringify(state);
             if (window.location.hash !== new_hash) {
                 window.location.hash = expected_hash = new_hash;
             }
         },

         // Returns the data stored in the session state. Normally, this will
         // be whatever value was passed to juice.session.set last. If the
         // state is empty or uninitialized or doesn't evaluate to an object,
         // however, this function returns the default state (i.e. whatever
         // was given to the init function).

         get: function() {
             if (window.location.hash.charAt(0) === '#') {
                 return juice.json_parse_safe(window.location.hash.substr(1));
             }
             return {};
         }
     };

     // Install a function to compare the hash to what we think it should look
     // like. If it changes, invoke our on-change handlers. This also handles
     // the case where the user modifies the hash marker by hand.

     expected_hash = window.location.hash;
     setInterval(function() {
                     if (window.location.hash !== expected_hash) {
                         expected_hash = window.location.hash;
                         ignore_set_calls = true;
                         juice.event.publish("juice.history", juice.history.get());
                         ignore_set_calls = false;
                     }
                 },
                 100);

 })(juice);
