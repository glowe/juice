/*
Define your rpc proxies in this file.

*/

juice.rpc.set_proxy(
    juice.rpc.create_basic_boxcar_proxy(
        juice.url.make({base: 'http://www.foobar.com',
                        path: '/rpc/'})));
