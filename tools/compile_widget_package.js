load('juice/tools/build.js');
load('juice/tools/compile.js');

var
deps,
lines,
pkg,
settings,
templates,
widgets;

settings = juice.build.load_settings(arguments);
pkg = settings.args.shift();

deps = juice.compile.read_widget_package_dependencies(pkg);
templates = juice.compile.read_source_file(settings.make_build_path('tmp/proj/templates/' + pkg + '.js'));

widgets = [];
juice.foreach(juice.build.ls('proj/widgets/' + pkg, /[.]js$/),
             function(filename) {
                 var lines = juice.compile.read_source_file(filename);
                 widgets = widgets.concat(juice.compile.scope_js(lines, ';'));
             });

lines = [];
lines.push('juice.widget.define_package(' +
           ["'" + pkg + "'",
            juice.dump(deps.r),
            juice.dump(deps.w),
            'function(juice, proj, jQuery) {'].join(', '));
lines.push('try {');
lines = lines.concat(templates.split('\n')).concat(widgets);
lines.push('} catch (e) { juice.error.handle(e); }');
lines = lines.concat('});');
juice.compile.write_target_file('js/proj/widgets/' + pkg + '.js', lines);
