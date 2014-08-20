#!/usr/bin/env node

/*
    Proxy to CORS-enable the ODSS endpoint to facilitate local development/testing.

    If using this proxy, adjust config to have:
       rest:         "http://localhost:9999/odss/platim",
       platformsUrl: "http://localhost:9999/odss/platforms"

    Note: At the moment, only GET requests seem to be handled properly by this proxy.
*/

var httpProxy = require('http-proxy');

var target = 'http://odss-test.shore.mbari.org';

var proxy = httpProxy.createProxyServer({});

proxy.on('proxyRes', function (proxyRes, req, res, options) {
    var headers = proxyRes.headers;
    headers['Access-Control-Allow-Origin'] = '*';
    //console.log('\n-----\nproxyRes', res);
});

require('http').createServer(function (req, res) {
    proxy.web(req, res, {
        target: target
    });
}).listen(9999);

proxy.on('proxyReq', function (req) {
    //console.log('--- proxyReq', req);
//    var headers = req.headers;
//    headers['access-control-request-method'] = 'GET, POST, OPTIONS, PUT, DELETE';
});

proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('Something went wrong.');
});


/*
var http = require('http');

function processRequest(request, response) {
    console.log(request.method + ": " + request.url);

    var proxyRequest = http.request({
        host: 'odss-test.shore.mbari.org',
        port: 80,
        path: request.url,
        method: request.method,
        headers: request.headers
    }, function (proxyResponse) {
        var headers = proxyResponse.headers;
        headers['Access-Control-Allow-Origin'] = '*';
        response.writeHead(proxyResponse.statusCode, headers);
        proxyResponse.pipe(response);
    });
    request.pipe(proxyRequest);
}


//http.createServer(processRequest).listen(9999);


http.createServer(function (req, res) {
    if (req.method == 'POST' || req.method == 'PUT' || req.method == 'OPTIONS') {
        req.body = '';

        req.addListener('data', function (chunk) {
            req.body += chunk;
        });

        req.addListener('end', function () {
            processRequest(req, res);
        });
    } else {
        processRequest(req, res);
    }

}).listen(9999);

*/
