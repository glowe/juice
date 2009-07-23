(function() {

     juice.build.minified_path = function(relpath) {
         if (!juice.build.config.minify()) {
             return relpath;
         }
         return relpath.replace(/^js\//, "jsmin/");
     };

     juice.build.minify = function() {
         var file_log = juice.build.target_js_file_log("minify");
         juice.foreach(file_log.files(),
                       function(f) {
                           var minified_path;
                           if (file_log.has_file_changed(f.path)) {
                               minified_path = juice.path_join("build", juice.build.minified_path(f.path.replace(/^build\//, "")));
                               juice.sys.mkdir(juice.sys.parse_path(minified_path).dir);
                               juice.sys.system("java -jar "+juice.home()+"/ext/tools/yuicompressor-2.4.2.jar -v "
                                                +f.path+" -o "+minified_path+" 2>/dev/null");
                               juice.log("Minify "+f.path+": OK.");
                           }
                       });
         file_log.save_and_update_all();
     };
 })();
