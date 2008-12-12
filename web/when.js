(function(juice) {

     juice.when = function(watchpoints) {

         var conditions = [], that;

         juice.foreach(watchpoints,
                       function(k,v) {
                           if (juice.is_undefined(v)) {
                               juice.error.raise("watchpoint '"+k+"' is undefined");
                           }
                       });

         that = {
             state: function(state, f) {
                 if (juice.is_array(state)) {
                     juice.foreach(state, function(s) { that.state(s, f); });
                     return;
                 }

                 if (juice.all(state,
                               function(watchpoint_name, expected) {
                                   return that.get(watchpoint_name) === expected;
                               }))
                 {
                     f();
                 }
                 else {
                     conditions.push([state, f]);
                 }
             },
             all: function(value, f) {
                 var state = {};
                 juice.foreach(watchpoints, function(k,v) { state[k] = value; });
                 return that.state(state, f);
             },
             set: function(what, value) {
                 watchpoints[what] = value;
                 that.test();
             },
             get: function(what) {
                 var wp = watchpoints[what];
                 return juice.is_function(wp) ? wp() : wp;
             },
             test: function() {
                 var working_conditions = conditions;
                 conditions = [];
                 juice.foreach(working_conditions,
                               function(c) {
                                   that.state(c[0], c[1]);
                               });
             }
         };

         return that;
     };

 })(juice);
