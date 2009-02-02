//
// This program loads all pages defined by the project and exits with a
// non-zero value if it encounters two pages with the same path. Dynamic paths
// are not checked.
//

load('juice/tools/build.js');
load('juice/tools/compile.js');

var
filenames,
seen,
settings;

settings = juice.build.load_settings(arguments);
filenames = settings.args;

// Load and eval the .js files in the project's pages directory.

//filenames = juice.build.ls(pages_dir, /[.]js$/);
eval(juice.compile.read_and_scope_source_files(filenames));

// For each page defined by the project, remember its path and name. If we
// encounter a second page with the same path, raise an error and exit. We
// ignore pages whose paths are dynamic because there's no straightforward
// test for overlap among dynamic paths.

seen = {};
juice.foreach(proj.pages,
              function(name, page) {
                  var path = page.path();
                  if (page.path_is_dynamic()) {
                      return;
                  }
                  if (seen.hasOwnProperty(path)) {
                      print("page path '"+path+"' shared by pages '"+seen[path]+"' and '"+name+"'");
                      quit(1);
                  }
                  seen[path] = name;
              });

print("OK");
