load('juice/tools/build.js');

var s, t, settings;
settings = juice.build.load_settings(arguments);
s = juice.proj_settings;
t = {site_base_url: s.site_base_url().to_string(),
     cookie_name: '__juice-' + settings.site + '-' + settings.mode,
     rpc_mocking: settings.rpc_mocking,
     smother_alerts: (settings.mode == 'release')};
print('proj.settings = ' + juice.dump(t) + ';');
