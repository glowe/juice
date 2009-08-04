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

         get: function() {
             var old_history = dhtmlHistory.getCurrentLocation();
             if (old_history === "") {
                 return {};
             }
             return JSON.parse(decodeURI(old_history));
         },

         set: function(json) {
             dhtmlHistory.ignoreLocationChange = true;
             dhtmlHistory.add(JSON.stringify(json));
         }
     };
 })(juice, dhtmlHistory, JSON);
