var w = proj.widgets;

/*
This is the sandbox page--a place for you to experiment with new widgets.
Add the name of your widget package to the widget_packages array, construct
your widgets in init_widgets, and add it to the "a" panel.
*/

juice.page.define(
    {name: 'sandbox',
     path: '/sandbox/',
     layout: proj.layouts.sandbox,
     widget_packages: ['sandbox'],
     init_widgets: function(args) {
         return {a: []};
     }
    });


/* Define your own custom 404 page here. For example:

juice.page.define_404(
    {layout: proj.layouts.page_not_found,
     init_widgets: function() { return {a: [w.core.page_not_found()]}; }
    });

*/


/*

Define your custom pages here.

*/

juice.page.define(
    {name: 'front_door',
     title: 'juice front page',
     path: '/',
     layout: proj.layouts.sandbox,
     widget_packages: ['example'],
     init_widgets: function(args) {
         return {a: [w.example.welcome()]};
     }
    });
