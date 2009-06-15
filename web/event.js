(function(juice) {
     var
     assert_registered,
     subscribers = {};

     assert_registered = function(name) {
         if (!juice.is_array(subscribers[name])) {
             juice.error.raise('event_not_registered', {name: name});
         }
     };

     juice.event = {

         // +-------------------------------------+
         // | generic publish/subscribe interface |
         // +-------------------------------------+

         register: function() {
             juice.foreach(juice.args(arguments),
                           function(name) {
                               if (subscribers[name]) {
                                   juice.error.raise('event_already_registered', {event_name: name});
                               }
                               else {
                                   subscribers[name] = [];
                               }
                           });
         },

         publish: function(name, payload) {
             assert_registered(name);
             var subs = subscribers[name], i;
             for (i = subs.length-1; i >= 0; i--) {
                 if (subs[i].fn(payload) === false) {
                     return;
                 }
             }
         },

         subscribe: function(subscriber_id, name, fn) {
             assert_registered(name);
             subscribers[name].push({id: subscriber_id, fn: juice.error.make_safe(fn)});
         },

         cancel_subscriptions: function(subscriber_id) {
             juice.foreach(subscribers,
                           function(name, pairs) {
                               subscribers[name] = juice.filter(subscribers[name],
                                                                function(pair) {
                                                                    return pair.id !== subscriber_id;
                                                                });
                           });
         }
     };

 })(juice);
