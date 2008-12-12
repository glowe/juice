/*

Define your custom pages here.

*/

var w = proj.widgets;

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
