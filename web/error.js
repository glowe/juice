(function(juice) {
     var custom_error_handler, mozilla_stack_frames;

     juice.errors = []; // the default handler stores all errors in here

     // Attempts to convert the stack property, of the Mozilla Error object,
     // to a structured format (i.e., an Object).

     mozilla_stack_frames = function(stack) {
         if (!juice.is_string(stack)) {
             return stack;
         }
         stack = stack.replace(/\n$/, "");
         return juice.map(
             stack.split("\n"),
             function(frame_string) {
                 var frame = {}, match;
                 match = /(.*)?@(.+)?:([0-9]+)?/.exec(frame_string);
                 if (match) {
                     if (typeof(match[1]) !== "undefined") {
                         frame.error = match[1];
                     }
                     if (frame.error) {
                         // Remove extra parentheses.
                         frame.error = frame.error.replace(/^\((.*)\)$/, "$1");
                     }
                     frame.uri = match[2];
                     frame.line = match[3];
                 }
                 else {
                     juice.log("Couldn't match line: " + frame_string);
                 }
                 return frame;
             });
     };

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

         chain: function(message, info, cause) {
             var error;
             if (info) {
                 message += ": " + juice.dump(info);
             }
             error = new Error(message);
             error.cause = cause;
             return error;
         },

         // The built-in error handler. Juice has a bunch of internal
         // try-catch blocks that prevent exceptions from unwinding the stack
         // and generating cryptic messages in the browser javascript console;
         // the catch clauses generally call this function.

         handle: function(e, ignore_custom_handler) {
             if (juice.errors.length >= 10000) {
                 juice.log("too many errors; canceling error handlers");
                 juice.error.handle = function() {};
             }

             if (e.stack) {
                 e.stack = mozilla_stack_frames(e.stack);
             }

             if (e.cause && e.cause.stack) {
                 e.cause.stack = mozilla_stack_frames(e.cause.stack);
             }

             juice.errors.push(e);
             juice.log(String(e));

             // This is a kludge. By default, juice.util.loading sets the
             // cursor style to "wait", to indicate that juice is working in
             // the background, but an exception may have prevented the cursor
             // from returning to its normal style.

             jQuery("body").attr("style", "cursor: auto");

             // If a custom handler has been specified, call it now. Wrap it
             // in a try..catch block to avoid an infinite cascade of errors.

             if (juice.is_function(custom_error_handler) && !ignore_custom_handler) {
                 try {
                     custom_error_handler(e);
                 }
                 catch (e2) {
                     juice.error.handle(e2, true);
                 }
             }
         },

         // Specifies a site-specific error handler. The built-in handler
         // (juice.error.handle) will still be invoked first. Returns the old
         // custom error handler, or undefined if one hasn't been specified.

         set_custom_handler: function(fn) {
             var old_handler = custom_error_handler;
             custom_error_handler = fn;
             return old_handler;
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

