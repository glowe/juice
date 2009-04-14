#!/usr/bin/python

import BaseHTTPServer
import SimpleHTTPServer
import os
import signal
import sys
import thread
import time
import urlparse
import posixpath
import urllib


class JuiceHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    document_root = ""

    def translate_path(self, path):
        """Like SimpleHTTPServer.SimpleHTTPRequestHandler except we
        aren't restricted to the current directory"""

        # abandon query parameters
        path = urlparse.urlparse(path)[2]
        path = posixpath.normpath(urllib.unquote(path))
        words = path.split('/')
        words = filter(None, words)
        path = self.document_root
        for word in words:
            drive, word = os.path.splitdrive(word)
            head, word = os.path.split(word)
            if word in (os.curdir, os.pardir): continue
            path = os.path.join(path, word)
        print path
        return path


def run_server(server_address):
    JuiceHTTPRequestHandler.protocol_version = "HTTP/1.0"

    httpd = BaseHTTPServer.HTTPServer(server_address, JuiceHTTPRequestHandler)
    hostname, port = httpd.socket.getsockname()
    print "Serving HTTP on", hostname, "port", port, "..."
    httpd.serve_forever()

def main(args):
    args = args[1:]
    document_root, hostname, port, js_hostname, js_port = args

    JuiceHTTPRequestHandler.document_root = document_root

    base_server_address = (hostname, int(port))
    js_server_address   = (js_hostname, int(js_port))

    base = thread.start_new_thread(run_server, (base_server_address,))

    if js_server_address != base_server_address:
        js = thread.start_new_thread(run_server, (js_server_address,))

    signal.signal(signal.SIGINT, lambda signum, stackframe: thread.exit())

    while True:
        time.sleep(1)
        pass

if __name__ == '__main__':
    main(sys.argv)
