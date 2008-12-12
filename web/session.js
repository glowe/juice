(function(juice, proj, jQuery) {

     var initialized;

     juice.session = {

         init: function(default_state) {

             var
             database,
             expected_hash,
             on_change_handlers,
             state_is_protected,
             that;

             on_change_handlers = [];

             // The session is fundamentally a singleton. Therefore, the init
             // function must only be called once.

             if (initialized) {
                 juice.error.raise('session_already_initialized');
             }
             initialized = true;

             // The "database" object provides read and write access to the
             // hidden textarea we use to store session state. Obviously, the
             // textarea's ID can't change without breaking this module.

             database = (function() {
                             var $ = function() {
                                 return jQuery('#juice_session_data').get(0);
                             };
                             return {
                                 set: function(x) { $().value = x; },
                                 get: function()  { return $().value; }
                             };
                         })();

             that = {

                 // Updates the session state and the bookmark
                  // stored in window.location.hash. The `state`
                  // argument should contain the complete session
                  // state, while the `bookmark_keys` argument
                  // should contain the list of keys to extract
                  // from the state and store in the url bookmark.
                  // This function has no effect if the hash would
                  // not change (i.e. it doesn't add to the
                  // browser history by modifying the hash to the
                  // same value). Also, if we're inside the
                  // on_change_handlers functions, calling this
                  // function has no effect at all. This protects
                  // the application from accidentally adding
                  // history when the user hits the back/forward
                  // buttons.

                 set: function(bookmark_state, hidden_state) {
                     var new_hash;
                     if (state_is_protected) {
                         return;
                     }
                     if (window.location.hash === "" && juice.equals(bookmark_state, default_state)) {
                         return;
                     }
                     new_hash = '#' + JSON.stringify(bookmark_state);
                     if (window.location.hash !== new_hash) {
                         window.location.hash = expected_hash = new_hash;
                     }
                     database.set(JSON.stringify(hidden_state));
                 },

                 // Returns the data stored in the session state.
                 // Normally, this will be whatever value was
                 // passed to juice.session.set last. If the state
                 // is empty or uninitialized or doesn't evaluate
                 // to an object, however, this function returns
                 // the default state (i.e. whatever was given to
                 // the init function). Note that the bookmark
                 // always overrides the rest of the state.

                 get: function() {
                     var bookmark_state, state;
                     state = juice.json_parse_safe(database.get());
                     if (window.location.hash.charAt(0) === '#') {
                         bookmark_state = juice.json_parse_safe(window.location.hash.substr(1));
                     }
                     else {
                         bookmark_state = default_state;
                     }
                     juice.foreach(bookmark_state, function(k,v) { state[k] = v; });
                     return state;
                 },

                 // Specifies a function to be called when the
                 // bookmark (i.e. window.location.hash) changes.
                 // Note that the function won't be invoked after
                 // a call to juice.session.set, however; this
                 // handler is intended to deal with events not
                 // instigated by the application, such as the
                 // user hitting back/forward or changing the url
                 // in the address bar.

                 on_change: function(f) {
                     on_change_handlers.push(f);
                 }

             };

             // Install a function to compare the hash to what we
             // think it should look like. If it changes, invoke
             // our on-change handlers. This also handles the case
             // where the user modifies the hash marker by hand.

             expected_hash = window.location.hash;
             setInterval(function() {
                             var state;
                             if (window.location.hash !== expected_hash) {
                                 expected_hash = window.location.hash;
                                 state = that.get();
                                 state_is_protected = true;
                                 juice.foreach(on_change_handlers, function(f) { f(state); });
                                 state_is_protected = false;
                             }
                         },
                         100);

             return that;
         }
     };

 })(juice, proj, jQuery);
