juice.build.categorize_source_files(
    {dir: "user"},
    function(filename) {
        return "ecss";
    });

juice.build.apply_to_source_files(
    function(source_files) {
        var target_dir = juice.build.target_file_path("style");
        juice.sys.mkdir(target_dir);

        juice.foreach(source_files,
                      function(source_file) {
                          var pp = juice.sys.parse_path(source_file.path);
                          juice.sys.system("ecss -i " + pp.path +
                                           " -o " + target_dir + "/" + pp.without_ext + ".css");
                      });
    });

