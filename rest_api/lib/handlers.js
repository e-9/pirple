'use strict';

/*
* Request handlers
* 
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');


// Define the handlers
let handlers = {};

// Users
handlers.users = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    }
    else callback(405);
}

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
    // Check that all required fields are filled out
    const firstName = typeof(data.payload.firstName) === 'string' &&
                        data.payload.firstName.trim().length > 0 ?
                        data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) === 'string' &&
                        data.payload.lastName.trim().length > 0 ?
                        data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) === 'string' &&
                    data.payload.phone.trim().length === 10 ?
                    data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' &&
                    data.payload.password.trim().length > 0 ?
                    data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' &&
                    data.payload.tosAgreement === true ?
                    true : false;

    if(firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone)
        .then( data => {
            callback(400, {'Error' : 'A user with that phone number already exists'});
        })
        .catch( err => {
            // Hash the password
            const hashedPassword = helpers.hash(password);

            if(hashedPassword) {
                // Create the user object
                const userObject = {
                    'firstName' : firstName,
                    'lastName' : lastName,
                    'phone' : phone,
                    'hashedPassword' : hashedPassword,
                    'tosAgreement' : tosAgreement
                };

                // Store the user
                _data.create('users', phone, userObject)
                .then( _ => callback(200))
                .catch( error => {
                    console.error(error);
                    callback(500, {'Error' : 'Could not create the new user'});
                });
            }
            else {
                callback(500, {'Error' : 'Could not hash the new user password'});
            }
        });
    }
    else callback(400, {'Error' : 'Missing required fields'});
}

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone) === 'string' &&
                    data.queryStringObject.phone.trim().length === 10 ? 
                    data.queryStringObject.phone.trim() : false;
    if(phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                // Lookup the user
                _data.read('users', phone)
                .then( data => {
                    if(data) {
                        // Remove the hash password from the user object before returning it to the requester
                        delete data.hashedPassword;
                        callback(200, data);
                    }
                    else callback(404);
                })
                .catch( err => {
                    callback(404);
                });
            }
            else callback(400, {'Error' : 'Missing required token in header, or token is invalid'});
        });
    }
    else callback(400, {'Error' : 'Missing required field'});
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
    // Check for the required field
    const phone = typeof(data.payload.phone) === 'string' &&
                    data.payload.phone.trim().length === 10 ? 
                    data.payload.phone.trim() : false;
    
    // Check for the optional fields
    const firstName = typeof(data.payload.firstName) === 'string' &&
                        data.payload.firstName.trim().length > 0 ?
                        data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) === 'string' &&
                        data.payload.lastName.trim().length > 0 ?
                        data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) === 'string' &&
                    data.payload.password.trim().length > 0 ?
                    data.payload.password.trim() : false;
    
    // Error if the phone is invalid
    if(phone) {
        if(firstName || lastName || password) {
            // Get the token from the headers
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
            
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if(tokenIsValid) {
                    // Look up the user
                    _data.read('users', phone)
                    .then( data => {
                        if(firstName) data.firstName = firstName;
                        if(lastName) data.lastName = lastName;
                        if(password) data.hashedPassword = helpers.hash(password);

                        // Store the new updates
                        _data.update('users', phone, data)
                        .then( _ => callback(200))
                        .catch( err => {
                            console.error(err);
                            callback(500, {'Error': 'Could not update the user'});
                        })
                    })
                    .catch( err => { 
                        callback(400, {'Error' : 'The specified user does not exist'});
                    });     
                }
                else callback(400, {'Error' : 'Missing required token in header, or token is invalid'});
            });
        }
        else callback(400, {'Error' : 'Missing fields to update'});
    }
    else callback(400, {'Error' : 'Missing required field'});
}

// Users - delete
// Required data: phone
handlers._users.delete = function(data, callback) {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone) === 'string' &&
                    data.queryStringObject.phone.trim().length === 10 ? 
                    data.queryStringObject.phone.trim() : false;
    if(phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
            
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                _data.read('users', phone)
                .then( userData => {
                    if(data) {
                        _data.delete('users', phone)
                        .then( _ => {
                            // Delete each of the checks associated to the user
                            let userChecks = typeof(userData.checks) === 'object' && 
                                            userData.checks instanceof Array ?
                                            userData.checks : [];
                            const checksToDelete = userChecks.length;

                            if(checksToDelete > 0) {
                                let checksDeleted = 0;
                                let deletionErrors = false;

                                // Loop trhough the checks
                                userChecks.forEach(checkId => {
                                    // Delete the check
                                    _data.delete('checks', checkId)
                                    .then( _ => {
                                        checksDeleted += 1;
                                        if(checksDeleted === checksToDelete) {
                                            if(!deletionErrors) callback(200);
                                            else callback(500, {'Error' : 'Errors encountered while attempting to delete all of the users checks, All checks may no have been deleted from the system successfully'});
                                        }
                                    })
                                    .catch( _ => deletionErrors = true);
                                });
                            }
                            else callback(200);
                        })
                        .catch( err => callback(500, {'Error' : 'Could not delete the specified user'}));
                    }
                    else callback(400, {'Error' : 'Could not find the specified user'});
                })
                .catch( err => {
                    callback(404);
                });     
            }
            else callback(400, {'Error' : 'Missing required token in header, or token is invalid'});
        });
    }
    else callback(400, {'Error' : 'Missing required field'});
}



// Tokens
handlers.tokens = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    }
    else callback(405);
}

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
    const phone = typeof(data.payload.phone) === 'string' &&
                    data.payload.phone.trim().length === 10 ?
                    data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' &&
                    data.payload.password.trim().length > 0 ?
                    data.payload.password.trim() : false;

    if(phone && password) {
        // Lookup the user who matches the phone number
        _data.read('users', phone)
        .then( data => {
            if(data) {
                // Hash the sent password, and compare it to the password soter in the user object
                const hashedPassword = helpers.hash(password);
                if(hashedPassword === data.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiration date 1 hour in the future
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        'phone' : phone,
                        'id' : tokenId,
                        'expires' : expires
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject)
                    .then( _ => callback(200, tokenObject))
                    .catch( err => callback(500, {'Error' : 'Could not create the new token'}));
                }
                else callback(400, {'Error': 'Password did not match the specified user stored password'});
            }
        })
        .catch( err => {
            callback(400, {'Error' : `Could not find the specified user, error: ${err}`});     
        })
    }
    else callback(400, {'Error' : 'Missing required fields'});
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
    // Check that the id is valid
    const id = typeof(data.queryStringObject.id) === 'string' &&
                    data.queryStringObject.id.trim().length === 20 ? 
                    data.queryStringObject.id.trim() : false;
    if(id) {
        _data.read('tokens', id)
        .then( data => {
            if(data) {
                // Remove the hash password from the user object before returning it to the requester
                callback(200, data);
            }
            else callback(404);
        })
        .catch( err => {
            callback(404);
        })
    }
    else callback(400, {'Error' : 'Missing required field'});
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
    const id = typeof(data.payload.id) === 'string' &&
                    data.payload.id.trim().length === 20 ?
                    data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) === 'boolean' &&
                    data.payload.extend === true ?
                    true : false;

    if(id && extend){
        // Look up the token
        _data.read('tokens', id)
        .then( data => {
            // check to make sure the token isn't already expired
            if(data.expires > Date.now()) {
                // Set the expiration an hour from now
                data.expires = Date.now() + 1000 * 60 * 60;

                // Store the new updates
                _data.update('tokens', id, data)
                .then( _ => callback(200))
                .catch( err => callback(500, {'Error' : 'Could not update the tokens expiration'}));
            }
            else callback(400, {'Error' : 'The token has already expider'});
        })
        .catch( err => callback(400, {'Error' : 'Specified token does not exist'}));
    }
    else callback(400, {'Error' : 'Missing required fields or fields are invalid'});
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
    // Check that the id is valid
    const id = typeof(data.queryStringObject.id) === 'string' &&
                    data.queryStringObject.id.trim().length === 20 ? 
                    data.queryStringObject.id.trim() : false;
    if(id) {
        _data.read('tokens', id)
        .then( data => {
            if(data) {
                _data.delete('tokens', id)
                .then( _ => callback(200))
                .catch( err => callback(500, {'Error' : 'Could not delete the specified token'}));
            }
            else callback(400, {'Error' : 'Could not find the specified token'});
        })
        .catch( err => {
            callback(404);
        })
    }
    else callback(400, {'Error' : 'Missing required field'});
};

// Verify if a given id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
    // Lookup the token
    _data.read('tokens', id)
    .then( data => {
        if(data.phone === phone && data.expires > Date.now()) {
            callback(true);
        }
        else callback(false);
    })
    .catch( _ => callback(false));
};



// Checks
handlers.checks = function(data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    }
    else callback(405);
}

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCode, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback) {
    // Validate inputs
    const protocol = typeof(data.payload.protocol) === 'string' &&
                    ['https', 'http'].indexOf(data.payload.protocol) > -1 ?
                    data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' &&
                    data.payload.url.trim().length > 0  ?
                    data.payload.url.trim() : false;
    const method = typeof(data.payload.method) === 'string' &&
                    ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
                    data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) === 'object' &&
                    data.payload.successCodes instanceof Array &&
                    data.payload.successCodes.length > 0  ?
                    data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' &&
                    data.payload.timeoutSeconds % 1 === 0 &&
                    data.payload.timeoutSeconds >= 1
                    data.payload.timeoutSeconds <= 5  ?
                    data.payload.timeoutSeconds : false;

    if(protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;        

        // Lookup the user by reading the token
        _data.read('tokens', token)
        .then( data => {
            const userPhone = data.phone;

            // Lookup the user data
            _data.read('users', userPhone)
            .then( userData => {
                const userChecks = typeof(userData.checks) === 'object' && 
                                    userData.checks instanceof Array ?
                                    userData.checks : [];
                
                // Verify that the user has less than the max number of checks
                if(userChecks.length < config.maxChecks) {
                    // Create a random id for the check
                    const checkId = helpers.createRandomString(20);
                    
                    // Create the check object, and include the users phone
                    const checkObject = {
                        'id' : checkId,
                        'userPhone' : userPhone,
                        'protocol' : protocol,
                        'url' : url,
                        'method' : method,
                        'successCodes' : successCodes,
                        'timeoutSeconds' : timeoutSeconds
                    };
                    
                    // Save the object
                    _data.create('checks', checkId, checkObject)
                    .then( data => {
                        // Add the check id to the users object
                        userData.checks = userChecks;
                        userData.checks.push(checkId);
                        
                        // Save the new user data
                        _data.update('users', userPhone, userData)
                        .then( data => callback(200, checkObject))
                        .catch( err => callback(500, {'Error' : 'Could not update the user with the new check'}));
                    })
                    .catch( err => callback(500, {'Error' : 'Could not crete the new check'}));
                }
                else callback(400, {'Error' : `The user already has the maximum nuber of checks ${config.maxChecks}`});
            })
            .catch( err => callback(403, err));
        })
        .catch( err => callback(403));
    }
    else callback(400, {'Error' : 'Missing required inputs, or inputs are invalid'});
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback) {
    // Check that the phone number is valid
    const id = typeof(data.queryStringObject.id) === 'string' &&
                    data.queryStringObject.id.trim().length === 20 ? 
                    data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the check
        _data.read('checks', id)
        .then( checkData => {
            // Get the token from the headers
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
            
            // Verify that the given token is valid and belongs to the user who created the check
            handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                if(tokenIsValid) {
                    // Return the check data
                    callback(200, checkData);
                }
                else callback(403);
            });
        })
        .catch( err => callback(404));        
    }
    else callback(400, {'Error' : 'Missing required field'});
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCode, timeoutSeconds
// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._checks.put = function(data, callback) {
    // Check for the required field
    const id = typeof(data.payload.id) === 'string' &&
                    data.payload.id.trim().length === 20 ? 
                    data.payload.id.trim() : false;
    
    // Check for the optional fields
    const protocol = typeof(data.payload.protocol) === 'string' &&
                    ['https', 'http'].indexOf(data.payload.protocol) > -1 ?
                    data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' &&
                    data.payload.url.trim().length > 0  ?
                    data.payload.url.trim() : false;
    const method = typeof(data.payload.method) === 'string' &&
                    ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
                    data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) === 'object' &&
                    data.payload.successCodes instanceof Array &&
                    data.payload.successCodes.length > 0  ?
                    data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' &&
                    data.payload.timeoutSeconds % 1 === 0 &&
                    data.payload.timeoutSeconds >= 1
                    data.payload.timeoutSeconds <= 5  ?
                    data.payload.timeoutSeconds : false;
    
    
    // Error if the phone is invalid
    if(id) {
        // Chekc to make sure one or more optional fields has been sent
        if(protocol || url || method || successCodes || timeoutSeconds) {
            // Lookup the check
            _data.read('checks', id)
            .then( checkData => {
                // Get the token from the headers
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

                // Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                    if(tokenIsValid) {
                        if(protocol) checkData.protocol = protocol;
                        if(url) checkData.url = url;
                        if(method) checkData.method = method;
                        if(successCodes) checkData.successCodes = successCodes;
                        if(timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

                        // Store the new updates
                        _data.update('checks', id, checkData)
                        .then( _ => callback(200))
                        .catch( _ => callback(500, {'Error' : 'Could not update the check'}));
                    }
                    else callback(403);
                });
            })
            .catch( err => callback(400, {'Error' : 'CheckID did not exists'}));
        }
        else callback(400, {'Error' : 'Missing fields to update'});
    }
    else callback(400, {'Error' : 'Missing required field'});
}

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {
    // Check that the phone number is valid
    const id = typeof(data.queryStringObject.id) === 'string' &&
                    data.queryStringObject.id.trim().length === 20 ? 
                    data.queryStringObject.id.trim() : false;
    if(id) {
        // Lookup the check
        _data.read('checks', id)
        .then( checkData => {
            // Get the token from the headers
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                if(tokenIsValid) {
                    // Delete the check data
                    _data.delete('checks', id)
                    .then( data => {
                        
                        _data.read('users', checkData.userPhone)
                        .then( userData => {
                            let userChecks = typeof(userData.checks) === 'object' && 
                                    userData.checks instanceof Array ?
                                    userData.checks : [];

                            // Remove the deleted check from list of checks
                            const checkPosition = userChecks.indexOf(id);

                            if(checkPosition > -1) {
                                userChecks.splice(checkPosition, 1);

                                _data.update('users', checkData.userPhone, userData)
                                .then( _ => callback(200))
                                .catch( err => callback(500, {'Error' : 'Could not update the specified user'}));
                            }
                            else callback(500, {'Error' : 'Could not find the check on the users object'});                            
                        })
                        .catch( err => {
                            callback(404);
                        });     
                    })
                    .catch( _ => callback(500, {'Error' : 'Could not delete check'}));
                }
                else callback(400, {'Error' : 'Missing required token in header, or token is invalid'});
            });
        })
        .catch( _ => callback(400, {'Error' : 'Specified check does not exist'}));        
    }
    else callback(400, {'Error' : 'Missing required field'});
}

// Ping habdler
handlers.ping = function(data, callback) {
    callback(200);
};

// Not found handler
handlers.notFound = function(data, callback) {
    callback(404);
};

// Export the module
module.exports = handlers;