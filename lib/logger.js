"use strict";

var through2 = require('through2');

module.exports = logger;

function logger(logfn) {
    logfn = logfn || console.log;
    return through2.obj(function(obj, encoding, callback) {
        logfn(obj);
        this.push(obj);
        callback();
    });
}
