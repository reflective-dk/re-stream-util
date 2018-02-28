"use strict";

var JSONStream = require('JSONStream');
var through2 = require('through2');

module.exports = {
    unwrapper: unwrapper,
    wrapper: wrapper
};

function unwrapper(onError, onHeader, onFooter) {
    var stream = JSONStream.parse([ 'objects', true ]);
    // Default behavior is to end the stream on error
    stream.on('error', onError || function() { this.end(); });
    if (onHeader) { stream.on('header', onHeader); }
    if (onFooter) { stream.on('footer', onFooter); }
    return stream;
}

function wrapper(statuses) {
    statuses = statuses || {};
    var prefix = '{"objects":[';
    var sep = '';
    return through2.obj(function(obj, encoding, callback) {
        this.push(prefix + sep + JSON.stringify(obj, trimErrors));
        prefix = '';
        sep = ',';
        callback();
    }, function(callback) {
        var suffix = ']';
        Object.keys(statuses).forEach(function(k) {
            suffix += ',' + JSON.stringify(k) + ':' + JSON.stringify(statuses[k]);
        });
        suffix += '}';
        this.push(prefix + suffix);
        callback();
    });
}

function trimErrors(ignored, value) {
    return value instanceof Error ? value.message : value;
}
