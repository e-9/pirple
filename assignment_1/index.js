'use strict';

/*
* API main file
* 
*/

// Require Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const router = require('./router');

// Instantiate HTTP server
const httpServer = http.createServer( (req, res) => {
    mainServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, _ => {
    console.log(`HTTP server listening on port ${config.httpPort}`);
});

// Main server logic
const mainServer = function(req, res) {

    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the  path
    const path = parsedUrl.pathname.replace(/^\/+|\/+$/g,'');

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get HTTP method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', data => {
        buffer += decoder.write(data);
    });
    req.on('end', _ => {
        buffer += decoder.end();

        // Choose the route this request should go to,
        // if one is not found, use the notFound route
        const choosenHandler = typeof(router[path]) !== 'undefined' ? 
                                router[path] : router.notFound;
        
        // Construct the data object to send to the handler
        const data = {
            'trimedPath' : path,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
        };

        // Route the request to the handler specified in the router
        choosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, 
            // or default to empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert the payload to a string
            const payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type','application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            console.log('Returning this response:', statusCode, payloadString );
        }); 
    });
};
