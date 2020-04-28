"use strict";

var through2 = require('through2');

module.exports = function wrapToArray(args) {
    let convert = (obj) => {
        return JSON.stringify(obj);
    };
    if (args && args.objectMode === true) {
        convert = (obj) => {
            return obj;
        };
    }
    var prefix = '[';
    var sep = '';
    return through2.obj(function(obj, encoding, callback) {
        this.push(prefix + sep + convert(obj));
        prefix = '';
        sep = ',';
        callback();
    }, function(callback) {
        var suffix = ']';
        this.push(prefix + suffix);
        callback();
    });
};