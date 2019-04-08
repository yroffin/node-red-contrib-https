'use strict';

var https = require('https')
    , port = 443
    , fs = require('fs')
    , path = require('path')
    ;

module.exports = function (RED) {
    function NodeRedHttpsServer(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.status({ fill: "red", shape: "dot", text: "waiting" });

        var options = {
            // this is ONLY the PRIVATE KEY
            key: fs.readFileSync(config.key)
            // You DO NOT specify `ca`, that's only for peer authentication
            // This should contain both cert.pem AND chain.pem (in that order) 
            , cert: fs.readFileSync(config.certificate)
        };

        // Main handler
        var app = function app(req, res) {
            // Simple basic auth checking
            var userpass = Buffer.from((req.headers.authorization || '').split(' ')[1] || '', 'base64').toString();
            if (userpass !== node.credentials.username + ':' + node.credentials.password) {
                res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="nope"' });
                res.end('HTTP Error 401 Unauthorized: Access is denied');
                return;
            }

            req.on('data', function (chunk) {
                node.send({
                    req: req,
                    res: res,
                    payload: JSON.parse(chunk.toString())
                });
                res.writeHead(200, '{}');
                res.end(chunk.toString());
            })
        };

        // Create server and listen on it
        var server = https.createServer(options, app).listen(config.port, function () {
            node.log('Listening on https://0.0.0.0:' + config.port);
            node.status({ fill: "green", shape: "dot", text: 'https://0.0.0.0:' + config.port });
        });

        // Handle node close
        this.on('close', function () {
            server.close();
        });
    }

    // Register this node
    RED.nodes.registerType("https-server", NodeRedHttpsServer, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" }
        }
    });
}