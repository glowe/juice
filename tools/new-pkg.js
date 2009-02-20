load('juice/tools/build.js');

var pkg_type, pkg_name, new_widget_pkg, new_rpc_pkg, usage;

new_widget_pkg = function(pkg_name) {
    var pkg_dir;

    if (juice.is_undefined(pkg_name)) {
        juice.error.raise('usage_error');
    }

    pkg_dir = 'proj/widgets/' + pkg_name;

    print("creating dir: " + pkg_dir);
    juice.build.mkdir(pkg_dir);

    print("writing stubs.");
    juice.build.write_file(pkg_dir + '/package',
                           ['/* Add any rpc and widget package dependencies here. */',
                            'var dependencies = { r: [], w: [] };'].join('\n'));
    juice.build.write_file(pkg_dir + '/' + pkg_name + '.js',
                           ['var r, w;',
                            '',
                            'r = proj.rpcs;',
                            'w = proj.widgets;',
                            '',
                            '/* Define your widgets here. Variables will be scoped to this file. */',
                            "juice.widget.define('dummy', function(that, my, spec) {",
                            "    my.render = function() { return 'dummy'; }",
                            '});',
                            ''].join('\n'));
};

new_rpc_pkg = function(pkg_name) {
    var pkg_dir;

    if (juice.is_undefined(pkg_name)) {
        juice.error.raise('usage_error');
    }

    pkg_dir = 'proj/rpcs/' + pkg_name;
    print("creating dir: " + pkg_dir);
    juice.build.mkdir(pkg_dir);

    print("writing stubs.");
    juice.build.write_file(pkg_dir + '/' + pkg_name + '.js',
                           '/* Define your rpcs here. */\n');
};

pkg_type = arguments.shift();
pkg_name = arguments.shift();

try {
    if (pkg_type === 'widget') {
        new_widget_pkg(pkg_name);
    }
    else if (pkg_type == 'rpc') {
        new_rpc_pkg(pkg_name);
    }
    else {
        juice.error.raise('usage_error');
    }
    print("done.");
    quit(0);
}
catch (e) {
    if (e.what === 'usage_error') {
        print("Usage: js juice/tools/new_pkg.js <widget|rpc> PKG_NAME");
        quit(2);
    }
    throw e;
}
