#!/usr/bin/python
import os
import sys

class UsageError(Exception):
    def __init__(self, msg):
        self.msg = msg

def run_server(args):
    os.chdir(args[1])
    import SimpleHTTPServer
    # hack to make SimpleHTTPServer work
    sys.argv = []
    SimpleHTTPServer.test()

if __name__ == '__main__':
    run_server(sys.argv)
