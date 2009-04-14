(function(juice, site, jQuery) {
     var
     current_namespace,
     enhancers = {},
     lib,
     render_stack = [];

     juice.widget = lib = {};

     lib.define = function(name, constructor) {

         var def, namespace, pkg;

         namespace = current_namespace.slice(0);
         pkg = juice.mget(site.lib, namespace);

         if (pkg[name]) {
             juice.error.raise('widget_already_defined', {namespace: current_namespace, name: name});
         }

         def = function(spec) {
             var
             container_attribs = {},
             container_element = 'div',
             destroy_event_system,
             dispose_of_domified_and_linked_widgets,
             domified_and_linked = [],
             enhancements = {},
             fire_domify_for_linked_widgets,
             id = juice.newid(),
             linked = [],
             my = {},
             state = 'initial',
             that = {},
             transition;

             (function() {
                  var
                  assert_registered,
                  publishers = {},
                  subscribers = {};

                  assert_registered = function(name, where) {
                      if (!juice.is_array(subscribers[name])) {
                          juice.error.raise('event_not_registered', {name: name, where: where});
                      }
                  };

                  destroy_event_system = function() {
                      subscribers = {};
                      juice.event.cancel_subscriptions(that.uuid());
                      juice.foreach(publishers,
                                    function(id, publisher) {
                                        publisher.__remove_subscriber(that.uuid());
                                    });
                  };

                  my.register_event = function() {
                      juice.foreach(juice.args(arguments),
                                    function(name) {
                                        if (subscribers[name]) {
                                            juice.error.raise('event_already_registered', {event_name: name});
                                        }
                                        else {
                                            subscribers[name] = [];
                                        }
                                    });
                  };

                  // Publish the specified event, passing `payload` to each
                  // subscriber. Subscribers are called in LIFO order. If a
                  // subscriber function returns false, the remaining
                  // subscriber functions are skipped.

                  my.publish = function(event_name, payload) {
                      var i, subs = subscribers[event_name];
                      assert_registered(event_name, 'publish');
                      for (i = subs.length-1; i >= 0; --i) {
                          try {
                              if (subs[i].fn(payload) === false) {
                                  return;
                              }
                          }
                          catch (e) {
                              juice.error.handle(e);
                          }
                      }
                  };

                  my.subscribe = function(publisher, event_name, fn) {
                      publisher.__add_subscriber(that.uuid(), event_name, fn);
                      publishers[publisher.uuid()] = publisher;
                  };

                  my.subscribe_self = function(event_name, fn) {
                      my.subscribe(that, event_name, fn);
                  };

                  my.propagate_event = function(publisher, event_name, new_event_name) {
                      my.subscribe(publisher, event_name,
                                   function(e) {
                                       my.publish(new_event_name || event_name, e);
                                   });
                  };

                  that.__add_subscriber = function(subscriber_uuid, event_name, fn) {
                      assert_registered(event_name, '__add_subscriber');
                      subscribers[event_name].push({id: subscriber_uuid, fn: fn});
                  };

                  that.__remove_subscriber = function(subscriber_uuid) {
                      juice.foreach(subscribers,
                                    function(event_name, pairs) {
                                        pairs = juice.filter(pairs,
                                                             function(pair) {
                                                                 return pair.id !== subscriber_uuid;
                                                             });
                                    });
                  };
              })();

             if (arguments.length === 0) {
                 spec = {};
             }

             that.uuid = function() {
                 return id;
             };

             my.raise = function(msg) {
                 juice.error.raise(msg, {widget_namespace: my.namespace, widget_name: my.name, widget_id: id});
             };

             my.namespace = namespace;
             my.name = name;
             my.selector = '#' + id;

             my.$ = function(selector) {
                 var elems = jQuery(my.selector);
                 if (elems.length === 0) {
                     my.raise('selector_error');
                 }
                 if (!selector) {
                     return elems;
                 }
                 return elems.find(selector);
             };

             that.show = function() { my.expect_state('domified'); my.$().show(); };
             that.hide = function() { my.expect_state('domified'); my.$().hide(); };
             that.remove = function() { my.expect_state('domified'); my.$().remove(); that.dispose(); };
             that.dispose = function() {
                 transition('domified', 'disposed');
                 my.publish('dispose');
                 destroy_event_system();
             };

             my.render = function() {
                 return '';
             };

             my.state = function() {
                 return state;
             };

             my.expect_state = function() {
                 var args = juice.args(arguments);
                 if (!juice.any(args, function(arg) { return state === arg; })) {
                     my.raise('bad_state', {expected: args, actual: state});
                 }
             };

             transition = function(from, to) {
                 my.expect_state(from);
                 state = to;
             };

             my.set_container_element = function(t, attribs) {
                 container_element = t;
                 container_attribs = attribs;
             };

             (function() {
                  var call_linked_render, render_impl;

                  call_linked_render = function(unsafe, f) {
                      var answer;
                      if (render_stack.length > 0) {
                          render_stack[render_stack.length-1](that);
                      }
                      else if (!unsafe) {
                          juice.error.raise('tried to render an unlinked widget ('+my.namespace.join('.')+'.'+my.name+')');
                      }
                      render_stack.push(function(w) { linked.push(w); });
                      answer = f();
                      render_stack.pop();
                      return answer;
                  };

                  render_impl = function(unsafe) {
                      return call_linked_render(
                          unsafe,
                          function() {
                              var attribs = {
                                  'class': namespace[0] + ' ' + namespace[2] + ' ' + name + ' widget',
                                  'id': id
                              };
                              juice.foreach(container_attribs,
                                            function(k, v) {
                                                if (k == 'id') {
                                                    juice.error.raise("can't specify id as container attribute");
                                                }
                                                if (k == 'class') {
                                                    attribs[k] += ' ' + v;
                                                }
                                                else {
                                                    attribs[k] = v;
                                                }
                                            });
                              transition('initial', 'rendered');
                              return '<' +
                                  container_element + ' ' +
                                  juice.map_dict(attribs,
                                                 function(k, v) {
                                                     return k + '="' + v + '"';
                                                 }).join(' ') +
                                  '>' + my.render() + '</' + container_element + '>';
                          });
                  };

                  that.render = function() { return render_impl(false); };
                  that.unsafe_render = function() { return render_impl(true); };
                  that.toString = that.render; // for convenience in templates

                  my.refresh = function(p) {
                      p = p || my.render;
                      dispose_of_domified_and_linked_widgets();
                      call_linked_render(
                          true, // ok to be unsafe; we're already domified
                          function() {
                              var r = juice.is_function(p) ? p() : p;
                              if (!juice.is_string(r)) {
                                  juice.error.raise('type_mismatch', {expected: 'String', actual: typeof r});
                              }
                              my.expect_state('domified');
                              my.$().html(r);
                              fire_domify_for_linked_widgets();
                          });
                  };
              })();

             my.register_event('domify');

             // Transitions this widget into the domified state, publishes its
             // domify event, and recursively domifies its children.

             that.fire_domify = function() {
                 transition('rendered', 'domified');
                 fire_domify_for_linked_widgets();
                 my.publish('domify');
             };

             // Calls f and return true if and only if the widget
             // is in the domified state. Otherwise, returns false.

             my.if_domified = function(f) {
                 if (my.state() === 'domified') {
                     f();
                     return true;
                 }
                 return false;
             };

             // If the widget is in the domified state, calls f
             // immediately. Otherwise, calls f when the widget
             // becomes domified.

             my.after_domify = function(f) {
                 my.if_domified(f) || my.subscribe_self('domify', f);
             };

             my.register_event('dispose');
             my.after_dispose = function(f) {
                 if (my.state() === 'disposed') {
                     f();
                     return;
                 }
                 my.subscribe_self('dispose', f);
             };

             fire_domify_for_linked_widgets = function() {
                 juice.foreach(linked, function(w) { w.fire_domify(); });
                 domified_and_linked = domified_and_linked.concat(linked);
                 linked = [];
             };

             dispose_of_domified_and_linked_widgets = function() {
                 juice.foreach(domified_and_linked, function(w) { w.dispose(); });
                 domified_and_linked = [];
             };

             that.enhance = function(name, spec) {
                 var css_class;
                 if (that.enhanced(name)) {
                     juice.error.raise('already_enhanced', {name: name});
                 }
                 if (!enhancers[name]) {
                     juice.error.raise('enhancer_not_defined', {name: name});
                 }
                 enhancements[name] = true;
                 css_class = 'enhancer_' + name.replace(/[.]/g, '_');
                 my.after_domify(function() { my.$().addClass(css_class); });
                 enhancers[name](that, my, spec);
                 return that;
             };

             that.enhanced = function(name) {
                 return !!enhancements[name];
             };

             try {
                 constructor(that, my, spec);
             }
             catch (e) {
                 juice.error.handle(e);
                 juice.error.raise('widget constructor failed for ' + name);
             }

             return that;
         };

         def.many = function(items) {
             return juice.map(items, function(i) { return def(i); });
         };

         pkg[name] = def;
         return def;
     };

     lib.define_local = function(name, constructor) {
         var def, message;
         def = lib.define(name, constructor);
         message = 'local widget instantiated without local constructor';

         juice.mdef(site.lib,
                    function(spec) {
                        juice.error.raise(message, {name: name});
                    },
                    current_namespace, name);

         juice.mdef(site.lib,
                    function(spec) {
                        juice.error.raise(message, {name: name});
                    },
                    current_namespace, name, 'many');
         return def;
     };

     lib.define_enhancer = function(name, constructor) {
         var enhancer_name = current_namespace[0] + '.' + current_namespace[2] + '.' + name;
         if (enhancers[enhancer_name]) {
             juice.error.raise('enhancer_already_defined', {name: enhancer_name});
         }
         enhancers[enhancer_name] = constructor;
     };

     // +---------------------------+
     // | package management system |
     // +---------------------------+

     lib.define_package = function(lib_name, pkg_name, constructor) {
         var namespace;
         if (current_namespace) {
             juice.error.raise("nested widget package", {current_namespace: current_namespace,
                                                         lib_name: lib_name,
                                                         pkg_name: pkg_name});
         }
         namespace = [lib_name, "widgets", pkg_name];
         current_namespace = namespace;
         constructor(juice, site, jQuery);
         current_namespace = null;
     };

 })(juice, site, jQuery);
