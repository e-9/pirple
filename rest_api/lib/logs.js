'use strict'

/**
 * Library for storing and rotating logs
 * 
 */

 const fs = require('fs');
 const path = require('path');
 const zlib = require('zlib');

 // Container for the module
 let lib = {};

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = function(file, str) {
    return new Promise( (resolve, reject) => {
        // Open the file for appending
        fs.open(lib.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
            if(!err && fileDescriptor) {
                // Append to the file and close it
                fs.appendFile(fileDescriptor, str+'\n', err => {
                    if(!err) {
                        fs.close(fileDescriptor, err => {
                            if(!err) {
                                resolve(false);
                            }
                            else reject('Error closing the file that was being appended');
                        })
                    }
                    else reject('Error appending the file');
                })
            }
            else reject('Could not open file for appending');
        });
    });
};

// List all the logs, and optionally include the compressed logs
lib.list = function(includeCompressedLogs) {
    return new Promise( (resolve, reject) => {
        fs.readdir(lib.baseDir, (err, data) => {
            if(!err && data && data.length > 0) {
                let trimmedFileNames = [];
                data.forEach( fileName => {
                    // Add the .log files
                    if(fileName.indexOf('.log') > -1) {
                        trimmedFileNames.push(fileName.replace('.log', ''));
                    }

                    // Add on the .gz files
                    if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                        trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                    }
                });
                resolve(trimmedFileNames);
            }
            else reject(err, data);
        });
    });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId) {
    return new Promise( (resolve, reject) => {
        const sourceFile = logId + '.log';
        const destFile = newFileId + '.gz.b64';

        // Read the source file
        fs.readFile(lib.baseDir + sourceFile, 'utf8', (err, inputString) => {            
            if(!err && inputString) {
                // Compress the data using gzip
                zlib.gzip(inputString, (err, buffer) => {
                    if(!err && buffer) {
                        // Send the data to the destination file
                        fs.open(lib.baseDir + destFile, 'wx', (err, fileDescriptor) => {
                            if(!err && fileDescriptor) {
                                // Write to the destination file
                                fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                                    if(!err) {
                                        // Close the destination file
                                        fs.close(fileDescriptor, err => {
                                            if(!err) resolve(true);
                                            else reject(err);
                                        })
                                    }
                                    else reject(err);
                                })
                            }
                            else reject(err);
                        });
                    }
                    else reject(err);
                });
            }
            else reject(err);
        });
    });
};

// Decompress the contents of a .gz.b64 into a string variable
lib.decompress = function(fileId) {
    return new Promise( (resolve, reject) => {
        const filenName = fileId + '.gz.b64';
        fs.readFile(lib.baseDir + fileName, 'utf8', (err, str) => {
            if(!err && str) {
                // Decompress the data
                const inputBuffer = Buffer.from(str, 'base64');
                zlib.unzip(inputBuffer, (err, outputBuffer) => {
                    if(!err && outputBuffer) {
                        // Callback
                        const str = outputBuffer.toString();
                        resolve(str);
                    }
                    else reject(err);
                })
            }
            else reject(err);
        });
    });
};

// Truncate a log file
lib.truncate = function(logId) {
    return new Promise( (resolve, reject) => {
        fs.truncate(lib.baseDir + logId + '.log', 0, err => {
            if(!err) resolve(false);
            else reject(err);
        })
    });
};

 // Export the module
 module.exports = lib;