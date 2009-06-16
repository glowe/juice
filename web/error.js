(function(juice) {

     juice.errors = []; // the default handler stores all errors in here

     juice.error = {

         // Throws an exception with the specified message and optional
         // information fields. This function should generally be preferred to
         // throwing raw objects.

         raise: function(message, info) {
             if (info) {
                 message += ": " + juice.dump(info);
             }
             throw new Error(message);
         },

         // Given an error (possibly an exception, possibly some arbitrary
         // object), creates an Error object and sets its cause field to the
         // provided cause object. Useful when catching a low-level exception
         // and translating it into a higher-level error before calling
         // juice.error.handle.

         chain: function(message, cause) {
             var error = new Error(message);
             error.cause = cause;
             return error;
         },

         // The error handler. Juice has a bunch of internal try-catch blocks
         // that prevent exceptions from unwinding the stack and generating
         // cryptic messages in the browser javascript console; the catch
         // clauses generally call this function. Note that projects are free
         // to override this function.

         handle: function(e) {
             juice.errors.push(e);
             juice.log(String(e));

             // This is a kludge. By default, juice.util.loading sets the
             // cursor style to "wait", to indicate that juice is working in
             // the background, but an exception may have prevented the cursor
             // from returning to its normal style.

             jQuery("body").attr("style", "cursor: auto");
         },

         // Given a function f, returns a function that is a proxy for f,
         // except it catches and handles, but does not re-raise, exceptions
         // thrown by f. Returns undefined if f throws an exception, and f's
         // normal return value otherwise.

         make_safe: function(f) {
             return function() {
                 var args = juice.args(arguments);
                 try {
                     return f.apply(null, args);
                 }
                 catch (e) {
                     juice.error.handle(e);
                 }
                 return undefined;
             };
         }
     };

 })(juice);

