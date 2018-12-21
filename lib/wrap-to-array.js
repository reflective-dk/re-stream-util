"use strict";

var through2 = require('through2');

module.exports = function wrapToArray() {
    var prefix = '[';
    var sep = '';
    return through2.obj(function(obj, encoding, callback) {
        this.push(prefix + sep + JSON.stringify(obj));
        prefix = '';
        sep = ',';
        callback();
    }, function(callback) {
        var suffix = ']';
        this.push(prefix + suffix);
        callback();
    });
};