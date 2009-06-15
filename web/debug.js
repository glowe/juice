
// Provides cookie-based persistence for juice.debug, a simple built-in
// debugging flag. Sites should rely on this flag to decide whether to display
// debug information to the user.

(function(juice) {
     var enabled = undefined;
     juice.debug = function() {
         var cookie;
         if (arguments.length === 0) {
             if (juice.is_undefined(enabled)) {
                 enabled = juice.is_null(cookie = juice.cookie.get("juice_debug"))
                     ? site.settings.config.debug : !!cookie;
             }
             return enabled;
         }
         enabled = !!arguments[0];
         juice.cookie.set("juice_debug", enabled ? true : "");
         return enabled;
     };
 })(juice);
