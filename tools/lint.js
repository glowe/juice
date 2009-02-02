// Since this program is responsible for linting the entire
// codebase (including itself), dependencies should be avoided
// (with the exception of the jslint source).

// Note to emacs users:
// Add the following snippet of elisp to link lint errors to their source files.
// (add-to-list 'compilation-error-regexp-alist
//              '("^\"\\(.+\\)\" in file \\(.+\\) at line \\(\[0-9\]+\\) character \\(\[0-9\]+\\)" 2 3 4))


load('juice/tools/build.js');
load('juice/ext/tools/fulljslint.js');

var arrow, e, i, settings, source_path;

settings = juice.build.load_settings(arguments);
source_path = settings.args.shift();

arrow = function(column) {
    var a = [], j;
    for (j = 0; j < column; j++) {
        a.push('.');
    }
    a.push('^');
    return a.join('');
};

if (!JSLINT(juice.build.read_file(source_path),
            {evil: true,
             forin: true,
             laxbreak: true,
             rhino: false,
             white: false}))
{
    for (i = 0; i < JSLINT.errors.length; i++) {
        e = JSLINT.errors[i];
        if (e) {
            print('"' + e.reason + '" in file ' + source_path + ' at line ' + (e.line + 1) + ' character ' + e.character);
            print(e.evidence);
            print(arrow(e.character));
            print();
        }
    }
    quit(1);
}
print('OK');
quit(0);
