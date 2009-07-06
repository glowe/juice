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
                                   juice.error.raise('event already registered', {event_name: name});
                               }
                               else {
                                   subscribers[name] = [];
                               }
                           });
         },

         publish: function(name, payload) {
             assert_registered(name);
             juice.foreach(subscribers[name],
                           function(subscriber) {
                               try {
                                   subscriber.fn(payload);
                               }
                               catch (e) {
                                   juice.error.handle(e);
                               }
                           });
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

     // juice system events here:

     juice.event.register("juice.ready", "juice.rpc_failure");

 })(juice);
