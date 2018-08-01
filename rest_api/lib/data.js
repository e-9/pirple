'use strict';

/*
* Library for storing and editing data
* 
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function(dir, file, data) {
    // Create promise
    return new Promise( (resolve, reject) => {
        // Open the file for writing
        fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', (err, fileDescriptor) => {
            if(!err && fileDescriptor) {
                // Convert data to string
                const stringData = JSON.stringify(data);

                // Write to file and close it
                fs.writeFile(fileDescriptor, stringData, err => {
                    if(!err) {
                        fs.close(fileDescriptor, err => {
                            if(!err) resolve();
                            else reject(`Error closing file: ${err}`);
                        });
                    }
                    else reject(`Error writing to file: ${err}`);
                });

            }
            else reject(`Could not create new file, error: ${err}`);
        });
    });
};

// Read data from a file
lib.read = function(dir, file) {
    // Create promise
    return new Promise( (resolve, reject) => {
        fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf-8', (err, data) => {
            if(!err && data) resolve(helpers.parseJsonToObject(data));
            else reject(err);
        });
    });
};

// Update data from a file
lib.update = function(dir, file, data) {
    // Create promise
    return new Promise( (resolve, reject) => {
        // Open the file for writing
        fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, fileDescriptor) => {
            if(!err && fileDescriptor) {
                // Convert data to string
                const stringData = JSON.stringify(data);

                // Truncate the file
                fs.truncate(fileDescriptor, err => {
                    if(!err) {
                        // Write to the file and close it
                        fs.write(fileDescriptor, stringData, err => {
                            if(!err) {
                                fs.close(fileDescriptor, err => {
                                    if(!err) {
                                        resolve();
                                    }
                                    else reject(`Error closing file ${file}`);
                                })
                            }
                            else reject(`Error writing to existing file ${file}`);
                        });
                    }
                    else reject(`Error truncating file ${file}`);
                });
            }
            else reject(`Could not open the file ${file} for uploading, it may not exist yet.`)
        });
    });
}

// Delete a file
lib.delete = function(dir, file) {
    // Create promise
    return new Promise( (resolve, reject) => {
        // Unlink the file
        fs.unlink(lib.baseDir+dir+'/'+file+'.json', err => {
            if(!err) resolve();
            else reject(`Error deleting file ${file}`);
        });
    });
}

// Export module
module.exports = lib;