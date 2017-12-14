"use strict";

var through2 = require('through2');

module.exports = projection;

function projection() {
    var props = Array.prototype.slice.call(arguments);
    return through2.obj(function (obj, enc, callback) {
        var next = {};
        props.forEach(function(p) {
            if (obj[p] != null) {
                next[p] = obj[p];
            }
        });
        this.push(next);
        callback();
    });
}
