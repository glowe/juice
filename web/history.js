(function(juice, dhtmlHistory, JSON) {
     dhtmlHistory.create(
             {toJSON: JSON.stringify,
              fromJSON: JSON.parse});

     juice.history = {
         init: function() {
             dhtmlHistory.initialize();
             dhtmlHistory.addListener(
                 function() {
                     juice.event.publish("juice.history", juice.history.get_token());
                 });
         },

         is_first_load: dhtmlHistory.isFirstLoad,

         get_token: function() {
             var old_token = dhtmlHistory.getCurrentLocation();
             if (old_token === "") {
                 return {};
             }
             return JSON.parse(decodeURI(old_token));
         },

         new_item: function(json) {
             dhtmlHistory.add(JSON.stringify(json));
         }
     };
 })(juice, dhtmlHistory, JSON);
