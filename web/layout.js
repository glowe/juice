(function(juice, site) {

     var panel_exists = function(panel_name, panels) {
         var i, children;
         if (panels.hasOwnProperty(panel_name)) {
             return true;
         }
         children = juice.filter(juice.values(panels), function(c) { return juice.is_object(c); });
         for (i = 0; i < children.length; i++) {
             if (panel_exists(panel_name, children[i])) {
                 return true;
             }
         }
         return false;
     };

     juice.layout = {
         define: function(name, panels) {
             site.layouts[name] = function(page_name) {
                 return {
                     to_html: function() {
                         var helper = function(panels) {
                             return juice.map_dict(panels,
                                                  function(panel_name, child_panels) {
                                                      return ['<div class="panel" id="panel_', panel_name,
                                                              '">', helper(child_panels), '</div>'].join('');
                                                  }).join('');
                         };
                         return ['<div class="layout ', name, '" id="page_',
                                 page_name, '">', helper(panels), '</div>'].join('');
                     },
                     add_widget: function(panel_name, widget) {
                         if (!panel_exists(panel_name, panels)) {
                             juice.error.raise('unrecognized_panel_name', {layout: name, unrecognized: panel_name, panels: panels});
                         }
                         jQuery('#panel_' + panel_name).append(widget.unsafe_render());
                         widget.fire_domify();
                     }
                 };
             };
         }
     };

     })(juice, site);
