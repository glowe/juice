juice.build.minify = function() {
    var files, file_log;

    // Find all .js files under the "build/js" directory and turn them into
    // source_file objects.

    files = juice.map(juice.build.file_find(juice.build.target_file_path("js"), /[.]js$/),
                      function(path) {
                          return juice.build.source_file({path: path, target_type: "whatever"});
                      });

    // Make a file_log object to determine which files have changed since our
    // last run, then minify the changed files.

    file_log = juice.build.file_log(files, "minify");
    juice.foreach(files,
                  function(f) {
                      if (file_log.has_file_changed(f.path)) {
                          juice.sys.system("java -jar "+juice.home()+"/ext/tools/yuicompressor-2.4.2.jar -v "
                                           +f.path+" -o "+f.path+" 2>/dev/null");
                          file_log.refresh_file_signature(f.path);
                          juice.log("Minify "+f.path+": OK.");
                      }
                  });

    file_log.save();
};
