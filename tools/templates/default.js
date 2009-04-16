(function() {
     var base_url = juice.url.make({base: "{{site_base_url}}"}),
     style_base_url = base_url.path_join("style");

     juice.build.set_site_settings(
         {base_url: base_url,
          cookie_name: "{{site_name}}",
          js_base_url: base_url,
          global_stylesheet_urls: [style_base_url.path_join("site.css")]
          });
 })();
