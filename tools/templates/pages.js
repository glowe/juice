/*
 This is the sandbox page--a place for you to experiment with new widgets.
 Add the name of your widget package to the widget_packages array, construct
 your widgets in init_widgets, and add it to the "a" panel.
*/

var widgets = juice.use("{{site_name}}.widgets");

juice.page.define(
    {name: 'sandbox',
     path: '/sandbox/',
     layout: site.layouts.sandbox,
     widget_packages: ['{{site_name}}.widgets.sandbox'],
     init_widgets: function(args) {
         return {
             a: [widgets.sandbox.welcome()]
         };
     }
    });
