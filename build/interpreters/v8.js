juice.sys.install_interpreter(
    {basename: sys.basename,
     canonical_path: sys.realpath,
     dirname: sys.dirname,
     exit: quit,
     file_exists: sys.file_exists,
     getenv: sys.getenv,
     read_dir: sys.read_dir,
     mkdir: sys.mkdir,
     read_file: sys.read_file,
     rmdir: sys.rmdir,
     sha1: sys.sha1,
     unlink: sys.unlink,
     write_file: sys.write_file
    });
