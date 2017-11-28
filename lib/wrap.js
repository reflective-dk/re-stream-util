"use strict";

var JSONStream = require('JSONStream');
var through2 = require('through2');

module.exports = {
    unwrapper: unwrapper,
    wrapper: wrapper
};

function unwrapper() {
    return JSONStream.parse([ 'objects', true ]);
}

function wrapper() {
    var prefix = '{"objects":[';
    var sep = '';
    return through2.obj(function(obj, encoding, callback) {
        this.push(prefix + sep + JSON.stringify(obj, trimErrors));
        prefix = '';
        sep = ',';
        callback();
    }, function(callback) {
        this.push(prefix + ']}');
        callback();
    });
}

function trimErrors(ignored, value) {
    return value instanceof Error ? value.message : value;
}
