juice.build.file_log = function(source_files, name) {
    var cache = {}, log, log_filename, sha1_file, sha1_file_cached;

    log_filename = ".juice-file-log-"+name+".json";
    if (juice.sys.file_exists(log_filename)) {
        log = juice.dict_intersect_keys(juice.build.read_file_json(log_filename),
                                        juice.map(source_files, function(f) { return f.path; }));
    }
    else {
        log = {};
    }

    sha1_file = function(filename) {
        if (juice.sys.file_exists(filename) == "file") {
            return juice.sys.sha1(juice.sys.read_file(filename));
        }
        return undefined;
    };

    sha1_file_cached = function(filename) {
        if (!cache.hasOwnProperty(filename)) {
            cache[filename] = sha1_file(filename);
        }
        return cache[filename];
    };

    return {
        empty: function() {
            return juice.keys(log).length === 0;
        },
        files: function() {
            return source_files;
        },
        has_file_changed: function(filename) {
            return sha1_file_cached(filename) !== log[filename];
        },
        refresh_file_signature: function(filename) {
            cache[filename] = sha1_file(filename);
        },
        update: function(file) {
            log[file.path] = sha1_file_cached(file.path);
        },
        save: function() {
            juice.sys.write_file(log_filename, JSON.stringify(log), true);
        },
        save_and_update_all: function() {
            juice.foreach(source_files, this.update);
            this.save();
        }
    };
};

// Delete all stored file logs.

juice.build.unlink_file_logs = function() {
    juice.foreach(juice.sys.list_dir(".", {filter_re: /[.]juice-file-log-.*[.]json$/, fullpath: true}),
                  function(filename) {
                      juice.sys.unlink(filename);
                  });
};

// Returns a file_log object that refers only to compiled javascript files.

juice.build.target_js_file_log = function(name, filter_pred_fn) {
    var files, file_log;

    filter_pred_fn = filter_pred_fn || function() { return true; };

    // Find all .js files under the "build/js" directory and turn them into
    // source_file objects. Special case: ignore the "juice-ext.js" file,
    // which consists of stuff we didn't write and would never pass lint.

    files = juice.map(juice.filter(juice.build.file_find(juice.build.target_file_path("js"), /[.]js$/), filter_pred_fn),
                      function(path) {
                          return juice.build.source_file({path: path, target_type: "whatever"});
                      });

    return juice.build.file_log(files, name + "-target_js");
};

