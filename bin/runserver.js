var docroot = juice.build.final_file_path('');
print("Running server with docroot: " + docroot);
juice.sys.system(juice.path_join(juice.home(), "tools/runserver.py ") + docroot);
