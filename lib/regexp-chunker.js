"use strict";

var through2 = require('through2');

module.exports = regexpChunker;

function regexpChunker(regexp) {
    var pattern = regexp instanceof RegExp ? regexp : new RegExp(regexp);
    var buffer = '';
    return through2(function(chunk, enc, callback) {
        buffer += chunk;
        while (true) {
            var match = pattern.exec(buffer);
            if (!match) {
                // No match yet - exit and await next chunk of text
                return callback();
            }
            // Matched - push element and wrap around to look for more
            this.push(match[0].toString());
            buffer = buffer.substring(match[0].length);
        }
    });
}
