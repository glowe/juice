load('juice/tools/build.js');

var files = [], proj_settings_filename;

// HACK: we can't load the build_settings file because it doesn't exist yet!
proj_settings_filename = arguments[1];
load(proj_settings_filename);

files.push('proj/layouts.js');
juice.foreach(['proj/prelude', 'proj/pages', 'proj/decorators'],
             function(dir) {
                 files = files.concat(juice.build.ls(dir, /[.]js$/));
             });
files.sort(
    function(a, b) {
        if (/\/prelude[.]js$/.test(a)) {
            if (!/\/prelude[.]js$/.test(b)) {
                return -1;
            }
        }
        else if (/\/prelude[.]js$/.test(b)) {
            return +1;
        }
        return a.localeCompare(b);
    });
files.push(juice.proj_settings.rpc_proxies_filename());

print(files.join("\n"));
