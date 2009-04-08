(function() {
     var base_url = juice.url.make({base: 'http://localhost:8000'});

     juice.build.set_site_settings(
         {base_url: base_url.toString(),
          cookie_name: '{{site_name}}',
          js_base_url: base_url.join_path('js').toString()
          });
 })();
