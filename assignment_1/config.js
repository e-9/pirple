'use strict'

/*
* Global configuration variables
* 
*/

// Container for all the environments
let environments = {};

// Dev stage
environments.dev = {
    'httpPort' : 8080,
    'envName' : 'dev'
};

// Production environment
environments.production = {
    'httpPort' : 8000,
    'envName' : 'production'
};

// Set environment requested from command line
const reqEnvironment = typeof(process.env.NODE_ENV) === 'string' ? 
                        process.env.NODE_ENV.toLowerCase() : '';

// Read requested environment, or set defaul dev environment
const envToExport = typeof(environments[reqEnvironment]) === 'object' ?
                    environments[reqEnvironment] : environments.dev;

// Export module
module.exports = envToExport;