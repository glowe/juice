#!/usr/bin/python

import BaseHTTPServer
import SimpleHTTPServer
import os
import signal
import sys
import thread

def run_server(server_address):
    httpd = BaseHTTPServer.HTTPServer(server_address, SimpleHTTPServer.SimpleHTTPRequestHandler)
    hostname, port = httpd.socket.getsockname()
    print "Serving HTTP on", hostname, "port", port, "..."
    httpd.serve_forever()

def main(args):
    args = args[1:]
    document_root, hostname, port, js_hostname, js_port = args

    os.chdir(document_root)
    base_server_address = (hostname, int(port))
    js_server_address   = (hostname, int(js_port))

    SimpleHTTPServer.SimpleHTTPRequestHandler.protocol_version = "HTTP/1.0"

    base = thread.start_new_thread(run_server, (base_server_address,))

    if js_server_address != base_server_address:
        js = thread.start_new_thread(run_server, (js_server_address,))

    signal.signal(signal.SIGINT, lambda signum, stackframe: thread.exit())

    while True:
        pass

if __name__ == '__main__':
    sys.exit(main(sys.argv))
