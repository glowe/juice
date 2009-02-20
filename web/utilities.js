(function(juice, proj, jQuery) {

     juice.util = {

         // This is the default message facility implementation; projects may
         // override it simply be setting juice.util.message to a new value,
         // but it must conform precisely to the interface provided here
         // because it is used by the framework to display errors.

         message: (function() {
                       var make_logfn = function(level) {
                           return function(message) {
                               juice.log("[" + level + "] " + message);
                               return { clear: function() {} };
                           };
                       };
                       return {
                           notice: make_logfn("notice"),
                           important: make_logfn("important"),
                           error: make_logfn("error"),
                           clear_all: function() {}
                       };
                   })(),

         //
         //
         //

         loading: (function() {
                       var num_outstanding_loads = 0;
                       return function() {
                           var message = juice.util.message.important('loading');
                           ++num_outstanding_loads;
                           jQuery('body').attr('style', 'cursor: wait;');
                           return function() {
                               message.clear();
                               if (--num_outstanding_loads === 0) {
                                   jQuery('body').attr('style', 'cursor: auto;');
                               }
                           };
                       };
                   })(),

         //
         // FIXME: move this into the juice-demo standard library
         //

         message: (function() {
                       var create_message, get_dock, dock;

                       get_dock = function(reset) {
                           if (!dock || reset) {
                               dock = jQuery('<div id="juice_message_dock"></div>').appendTo('body');
                           }
                           return dock;
                       };

                       create_message = function(type, text, options) {
                           var m;

                           m = $(templates.message({type: type, message: text})()).hide().fadeIn();
                           m.find('a.dismiss').click(function() { m.remove(); });
                           get_dock().html(m);

                           if (options && options.timeout) {
                               setTimeout(function() {
                                              if (m) {
                                                  m.fadeOut(function() { m.remove(); });
                                              }
                                          },
                                          options.timeout);
                           }

                           return {
                               clear: function() {
                                   if (m) {
                                       m.remove();
                                       m = null;
                                   }
                               },
                               click: function(fn) {
                                   if (m) {
                                       m.click(fn);
                                   }
                               }
                           };
                       };

                       return {
                           notice: function(text) {
                               create_message('notice', text, {timeout: 3000});
                           },
                           important: function(text) {
                               return create_message('important', text);
                           },
                           error: function(text) {
                               juice.util.message.clear_all();
                               return create_message('error', text);
                           },
                           clear_all: function() {
                               get_dock(true);
                           }
                       };
                   })()
     };

 })(juice, proj, jQuery);
