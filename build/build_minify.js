juice.build.minify = function(file_log) {
    juice.foreach(file_log.files(),
                  function(f) {
                      if (file_log.has_file_changed(f.path)) {
                          juice.sys.system("java -jar "+juice.home()+"/ext/tools/yuicompressor-2.4.2.jar -v "
                                           +f.path+" -o "+f.path+" 2>/dev/null");
                          file_log.refresh_file_signature(f.path);
                          juice.log("Minify "+f.path+": OK.");
                      }
                  });
};
