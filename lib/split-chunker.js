"use strict";

var through2 = require('through2');

module.exports = splitChunker;

function splitChunker(split, discardSplit) {
    var pattern = split instanceof RegExp ? split : new RegExp(split);
    var buffer = '', afterSplit;
    return through2(function(chunk, enc, callback) {
        buffer += chunk;
        while (true) {
            var match = pattern.exec(buffer);
            if (!match) {
                // No match yet - exit and await next chunk of text
                return callback();
            }
            // Matched - push element and wrap around to look for more
            afterSplit = match.index + match[0].length;
            this.push(buffer.substring(0, discardSplit ? match.index : afterSplit));
            buffer = buffer.substring(afterSplit);
        }
    }, function(callback) {
        this.push(buffer);
        callback();
    });
}
