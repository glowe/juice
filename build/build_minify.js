juice.build.minify = function() {
    var dirs, files, file_log;

    // Traverse the build tree and accumulate the list of directories we're
    // interested in searching for js files.

    dirs = [juice.build.target_file_path("js")];
    juice.foreach(juice.sys.list_dir(juice.build.target_file_path("js/libs"), {fullpath: true}),
                  function(lib_path) {
                      juice.foreach(["rpcs", "widgets"],
                                    function(type) {
                                        dirs.push(juice.path_join(lib_path, type));
                                    });
                  });

    // Find all js files in each directory and convert to source file objects,
    // accumulating in the files array.

    files = [];
    juice.foreach(dirs,
                  function(dir) {
                      files = files.concat(
                          juice.map(juice.sys.list_dir(dir, {fullpath: true, filter_re: /[.]js$/}),
                                    function(path) {
                                        return juice.build.source_file({path: path, target_type: "whatever"});
                                    }));
                  });

    // Make a file_log object to determine which files have changed since our
    // last run, then minify the changed files.

    file_log = juice.build.file_log(files, "minify");
    juice.foreach(files,
                  function(f) {
                      if (file_log.has_file_changed(f.path)) {
                          juice.sys.system("java -jar "+juice.home()
                                           +"/ext/tools/yuicompressor-2.4.2.jar -v "
                                           +f.path+" -o "+f.path+" 2>/dev/null");
                          file_log.refresh_file(f.path);
                          juice.log("Minify "+f.path+": OK.");
                      }
                  });

    file_log.save();
};
