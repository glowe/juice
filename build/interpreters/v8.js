juice.sys.install_interpreter(
    {basename: sys.basename,
     canonical_path: sys.realpath,
     dirname: sys.dirname,
     file_exists: sys.file_exists,
     getenv: sys.getenv,
     read_dir: sys.read_dir,
     mkdir: sys.mkdir,
     read_file: sys.read_file,
     sha1: sys.sha1,
     write_file: sys.write_file
    });
