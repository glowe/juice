/*
Define your rpc proxies in this file.


Here's an example rpc proxy:
*/

juice.rpc.set_proxy(
    juice.rpc.create_basic_boxcar_proxy(
        juice.url.make({base: "http://localhost",
                        path: "/rpc/"})));

