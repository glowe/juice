//
// TODO: consider queueing asynchronous UI events and processing them
// serially, i.e. in another "thread".
//

(function(juice, proj, jQuery) {
     var
     constructed,
     current_namespace,
     lib,
     render_stack;

     render_stack = [];

     juice.widget = lib = {};

     constructed = {}; // Number of widgets constructed per page load

     lib.define = function(name, constructor) {

         var def, namespace, pkg, unique_name;

         namespace = current_namespace;
         pkg = proj.widgets[namespace];

         if (pkg[name]) {
             juice.error.raise('widget_already_defined', {namespace: current_namespace, name: name});
         }

         unique_name = namespace + '.' + name;

         def = function(spec) {
             var
             call_linked_render,
             container_element = 'div',
             destroy_event_system,
             domified_and_linked = [],
             enhancements = {},
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

                  my.publish = function(event_name, payload) {
                      assert_registered(event_name, 'publish');
                      juice.foreach(subscribers[event_name],
                                   function(pair) {
                                       try {
                                           pair.fn(payload);
                                       }
                                       catch (e) {
                                           juice.error.handle(e);
                                       }
                                   });
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
             that.dispose = function() { transition('domified', 'disposed'); destroy_event_system(); };

             my.render = function() {
                 return '';
             };

             my.state = function() {
                 return state;
             };

             my.expect_state = function() {
                 var args = juice.args(arguments);
                 if (!juice.any(args, function(arg) { return state === arg; })) {
                     my.raise({what: 'bad_state', expected: args, actual: state});
                 }
             };

             transition = function(from, to) {
                 my.expect_state(from);
                 state = to;
             };

             my.set_container_element = function(t) { container_element = t; };

             call_linked_render = function(f) {
                 var answer;
                 if (render_stack.length > 0) {
                     render_stack[render_stack.length-1](that);
                 }
                 render_stack.push(function(w) { linked.push(w); });
                 answer = f();
                 render_stack.pop();
                 return answer;
             };

             that.render = function() {
                 return call_linked_render(
                     function() {
                         transition('initial', 'rendered');
                         return ['<', container_element, ' class="',
                                 namespace, ' ', name, ' widget" id="',
                                 id, '">', my.render(), '</',
                                 container_element, '>'].join('');
                     });
             };

             that.toString = that.render; // For convenience in templates

             my.register_event('domify');
             that.fire_domify = function() { my.publish('domify'); };

             // Calls f when the widget enters the domified state. Warning:
             // has no effect if the widget is already domified.

             my.on_domify = function(f) { my.subscribe_self('domify', f); };

             // Calls f and return true if and only if the widget is in the
             // domified state. Otherwise, returns false.

             my.if_domified = function(f) {
                 if (my.state() === 'domified') {
                     f();
                     return true;
                 }
                 return false;
             };

             // If the widget is in the domified state, calls f immediately.
             // Otherwise, calls f when the widget becomes domified.

             my.after_domify = function(f) {
                 if (!my.if_domified(f)) {
                     my.on_domify(f);
                 }
             };

             var fire_domify_for_linked_widgets = function() {
                 juice.foreach(linked, function(w) { w.fire_domify(); });
                 domified_and_linked = domified_and_linked.concat(linked);
                 linked = [];
             };
             var dispose_of_domified_and_linked_widgets = function() {
                 juice.foreach(domified_and_linked, function(w) { w.dispose(); });
                 domified_and_linked = [];
             };

             my.on_domify(
                 function() {
                     transition('rendered', 'domified');
                     fire_domify_for_linked_widgets();
                 });

             my.refresh = function(p) {
                 p = p || my.render;
                 dispose_of_domified_and_linked_widgets();
                 call_linked_render(
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

             that.enhance = function(name, spec) {
                 var css_class;
                 if (that.enhanced(name)) {
                     juice.error.raise('already_enhanced', {name: name});
                 }
                 if (!proj.enhancers[name]) {
                     juice.error.raise('enhancer_not_defined', {name: name});
                 }
                 enhancements[name] = true;
                 css_class = 'enhancer_' + name.replace(/[.]/g, '_');
                 my.on_domify(function() { my.$().addClass(css_class); });
                 proj.enhancers[name](that, my, spec);
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
                 juice.error.raise('widget constructor failed', {name: unique_name});
             }

             if (!constructed.hasOwnProperty(unique_name)) {
                 constructed[unique_name] = 0;
             }
             constructed[unique_name] += 1;

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
         message = 'local_widget_instantiated_without_local_constructor';
         proj.widgets[current_namespace][name] = function(spec) {
             juice.error.raise(message, {name: name});
         };
         proj.widgets[current_namespace][name].many = function(spec) {
             juice.error.raise(message, {name: name});
         };
         return def;
     };

     lib.define_enhancer = function(name, constructor) {
         var enhancer_name = current_namespace + '.' + name;
         if (proj.enhancers[enhancer_name]) {
             juice.error.raise('enhancer_already_defined', {name: enhancer_name});
         }
         proj.enhancers[enhancer_name] = constructor;
     };

     // +---------------------------+
     // | package management system |
     // +---------------------------+

     lib.define_package = function(namespace, rpc_deps, widget_deps, constructor) {
         var
         rpcs,
         scoped,
         widgets;

         if (current_namespace) {
             juice.error.raise('nested_widget_package', {current_namespace: current_namespace, namespace: namespace});
         }
         if (proj.widgets.hasOwnProperty(namespace)) {
             juice.error.raise('widget_package_already_defined', {namespace: namespace});
         }
         current_namespace = namespace;
         proj.widgets[namespace] = {};
         proj.enhancers[namespace] = {};
         constructor(juice, proj, jQuery);
         current_namespace = null;
     };

     lib.constructed = function() {
         return constructed;
     };

 })(juice, proj, jQuery);
