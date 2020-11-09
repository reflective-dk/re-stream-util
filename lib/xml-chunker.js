"use strict";

var through2 = require('through2');

module.exports = xmlChunker;

function xmlChunker() {
    var tags = Array.prototype.slice.call(arguments);
    if (tags.length == 0) {
        throw new Error('at least one XML tag must be specified');
    }
    var open = openPattern(tags);
    var end = endPattern(tags);
    var buffer = '';
    var openMatch, nestedMatch, endMatch, endsAt, skip;
    return through2(function(chunk, enc, callback) {
        buffer += chunk;
        var nestedLevels = 0;
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
            skip = nestedMatch ? nestedMatch.index + nestedMatch.tag.length
                : openMatch.index + openMatch.tag.length;
            nestedMatch = match(open, buffer, skip) || {};
            skip = endMatch ? endMatch.index + endMatch.tag.length
                : openMatch.index + openMatch.tag.length;
            endMatch = match(end, buffer, skip);
            if (openMatch.name == nestedMatch.name &&
                ((!endMatch) || nestedMatch.index < endMatch.index)) {
                nestedLevels++;
            } else {
                // The open tag, if any, is not nested
                nestedMatch = null;
            }
            if (!endMatch) {
                // Cannot close element yet - exit and await next chunk of text
                return callback();
            }
            if (openMatch.name != endMatch.name) {
                // nested element of different type detected - wrap around and skip match on next pass
                continue;
            }
            if (nestedMatch && nestedLevels) {
                // nested element of same type detected - decrement counter and wrap around
                nestedLevels--;
                continue;
            }
            // Closed - push element and wrap around to look for more
            endsAt = endMatch.index + endMatch.tag.length;
            this.push(buffer.substring(openMatch.index, endsAt));
            buffer = buffer.substring(endsAt);
            openMatch = endMatch = null;
        }
    });
}

function openPattern(tags) {
    return new RegExp('<(?:.+:)?(' + tags.join('|') + ')(?: [^</>]*)?/?>');
}

function endPattern(tags) {
    return new RegExp('</(?:.+:)?(' + tags.join('|') + ')>');
}

function match(pattern, string, skip) {
    var s = skip ? string.substring(skip) : string;
    var m = pattern.exec(s);
    return m ? {
        tag: m[0],
        name: m[1],
        index: m.index + (skip || 0)
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
