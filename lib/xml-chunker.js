"use strict";

var through2 = require('through2');
var pumpify = require('pumpify');
var ternary = require('ternary-stream');
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');
var wrap = require('./wrap');

module.exports = xmlChunker;

function xmlChunker() {
    var tags = Array.prototype.slice.call(arguments);
    if (tags.length == 0) {
        throw new Error('at least one XML tag must be specified');
    }
    var open = openPattern(tags);
    var end = endPattern(tags);
    var buffer = '';
    var openMatch, endMatch, endsAt;
    return through2(function(chunk, enc, callback) {
        buffer += chunk;
        while (true) {
            openMatch = openMatch || match(open, buffer);
            if (!openMatch) {
                // Nothing interesting - exit and await next chunk of text
                return callback();
            }
            if (selfClosing(openMatch)) {
                // Self-closing - push element and wrap around to look for more
                endsAt = openMatch.index + openMatch.tag.length;
                this.push(openMatch.tag);
                buffer = buffer.substring(endsAt);
                openMatch = null;
                continue;
            }
            endMatch = match(end, buffer);
            if (!endMatch) {
                // Cannot close element yet - exit and await next chunk of text
                return callback();
            }
            if (openMatch.name != endMatch.name) {
                throw new Error('interleaved XML elements: ' + openMatch.tag + endMatch.tag);
            }
            // Closed - push element and wrap around to look for more
            endsAt = endMatch.index + endMatch.tag.length;
            this.push(buffer.substring(openMatch.index, endsAt));
            buffer = buffer.substring(endsAt);
            endMatch = null;
        }
    });
}

function openPattern(tags) {
    return new RegExp('<(' + tags.join('|') + ')[^</>]*/?>');
}

function endPattern(tags) {
    return new RegExp('</(' + tags.join('|') + ')>');
}

function match(pattern, string) {
    var m = pattern.exec(string);
    return m ? {
        tag: m[0],
        name: m[1],
        index: m.index
    } : null;
}

function selfClosing(m) {
    return /^<[^<\/>]+\/>$/.test(m.tag);
}

// Expose for testing
module.exports.openPattern = openPattern;
module.exports.endPattern = endPattern;
module.exports.match = match;
module.exports.selfClosing = selfClosing;
