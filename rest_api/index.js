'use strict';

/*
* Primary file for the API
* Lesson: Connecting to an API
*/ 

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// @TODO GET RID OF THIS
helpers.sendTwilioSms('4141121610', 'Mamoruchan', function(err) {
    console.log('Twilio error', err);
})

// Instantiate the HTTP server
const httpServer = http.createServer( (req,res) => {
    unifiedServer(req,res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, _ => {
    console.log(`The HTTP server is listening on port ${config.httpPort}`);
});

// Instantiate the HTTPS server
const httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req,res) => {
    unifiedServer(req,res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, _ => {
    console.log(`The HTTPS server is listening on port ${config.httpsPort}`);
});

// All the server logic for both the http and https server
const unifiedServer = function(req,res) {
    
    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the  path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');

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

        // Choose the handler this request should go to,
        // if one is not found, use the notFound handler
        const choosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? 
                                router[trimmedPath] : handlers.notFound;
        
        // Construct the data object to send to the handler
        const data = {
            'trimedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified in the router
        choosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the peyload called back by the handler, 
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

// Define a request router
const router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};