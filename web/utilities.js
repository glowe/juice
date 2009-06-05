(function(juice, site, jQuery) {
     var current_lib_name;
     juice.util = {

         define: function(name, fn) {
             var util = juice.mget(site.lib, current_lib_name, 'util');

             if (util[name]) {
                 juice.error.raise('util already defined', {lib_name: lib_name, name: name});
             }

             util[name] = fn;
         },

         define_package: function(lib_name, constructor) {
             if (current_lib_name) {
                 juice.error.raise('nested utility package: ' + lib_name);
             }
             current_lib_name = lib_name;
             juice.mdef(site.lib, {}, lib_name, 'util');
             constructor(juice, site, jQuery);
             current_lib_name = null;
         },

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
                       var create_message, dock, get_dock;

                       get_dock = function(reset) {
                           if (!dock) {
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
                               get_dock().empty();
                           }
                       };
                   })(),

         // Typically called when there is an error by the juice system
         clear_loading_notifications: function() {
             jQuery('body').attr('style', 'cursor: auto;');
             juice.util.message.clear_all();
         }
     };

 })(juice, site, jQuery);
