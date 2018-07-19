'use strict';

/*
* Hanlders functions to process client requests
* 
*/

// Define the handlers object
let handlers = {}

// Hello handler
handlers.hello = function(data, callback) {
    callback(200, { 'greetings' : 'Hello Pirple World!'});
};

// Not Found handler
handlers.notFound = function(data, callback) {
    callback(404, { 'error' : 'Resource not found' });
};

// Ping handler
handlers.ping = function(data, callback) {
    callback(200);
};

// Define request router, or not found handler
const router = {
    'hello' : handlers.hello,
    'notFound' : handlers.notFound,
    'ping' : handlers.ping
};

// Exports router
module.exports = router;