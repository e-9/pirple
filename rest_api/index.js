'use strict';

/*
* Primary file for the API
* Lesson: Background workers
*/ 


// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
let app = {};

// Init funciton
app.init = function() {
    // Start the server
    server.init();

    // Start the workers
    workers.init();
};

// Execute init function
app.init();

// Export the app
module.exports = app;