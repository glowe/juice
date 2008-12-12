(function(juice, proj, jQuery) {

     juice.util = {
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

                           m = $(templates.message({type: type, message: text})())
                           .hide().fadeIn();

                           m.find('a.dismiss').click(function() { m.remove(); });

                           get_dock().append(m);

                           if (options && options.timeout) {
                               setTimeout(function() {
                                              if (m) {
                                                  m.fadeOut(function() {
                                                                m.remove();
                                                            });
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
                                   m.click(fn);
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
                   })(),

         loading: (function() {
                       var num_outstanding_loads = 0;
                       return function() {
                           ++num_outstanding_loads;
                           jQuery('body').attr('style', 'cursor: wait;');
                           return function() {
                               if (--num_outstanding_loads === 0) {
                                   jQuery('body').attr('style', 'cursor: auto;');
                               }
                           };
                       };
                   })(),

         loading: function(message) {
             jQuery('body').attr('style', 'cursor: wait;');
             return function() {
                 jQuery('body').attr('style', 'cursor: auto;');
             };
         },

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

                           m = $(templates.message({type: type, message: text})())
                           .hide().fadeIn();

                           m.find('a.dismiss').click(function() { m.remove(); });

                           get_dock().append(m);

                           if (options && options.timeout) {
                               setTimeout(function() {
                                              if (m) {
                                                  m.fadeOut(function() {
                                                                m.remove();
                                                            });
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
                                   m.click(fn);
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
