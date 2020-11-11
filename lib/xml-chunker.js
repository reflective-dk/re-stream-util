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
    var openMatch, nestedMatch, endMatch, endsAt, nestedSkip, endSkip;
    var nestedLevels = 0;
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
            nestedSkip = nestedMatch ? (nestedMatch.index + nestedMatch.tag.length)
                : nestedSkip || (openMatch.index + openMatch.tag.length);
            nestedMatch = match(open, buffer, nestedSkip);
            endSkip = endMatch ? (endMatch.index + endMatch.tag.length)
                : endSkip || (openMatch.index + openMatch.tag.length);
            endMatch = match(end, buffer, endSkip);
            if (nestedMatch && (openMatch.name == nestedMatch.name) &&
                ((!endMatch) || nestedMatch.index < endMatch.index)) {
              nestedLevels++;
            }
            if (!endMatch) {
                // Cannot close element yet - exit and await next chunk of text
                return callback();
            }
            if (openMatch.name != endMatch.name) {
                // nested element of different type detected - wrap around and skip match on next pass
                continue;
            }
            if (nestedLevels) {
                // nested element of same type detected - decrement counter and wrap around
                nestedLevels--;
                continue;
            }
            // Closed - push element and wrap around to look for more
            endsAt = endMatch.index + endMatch.tag.length;
            this.push(buffer.substring(openMatch.index, endsAt));
            buffer = buffer.substring(endsAt);
            openMatch = nestedMatch = endMatch = null;
            nestedSkip = endSkip = 0;
            nestedLevels = 0;
        }
    });
}

function openPattern(tags) {
    return new RegExp('<(?:[^</>]+:)?(' + tags.join('|') + ')(?: [^</>]*)?/?>');
}

function endPattern(tags) {
    return new RegExp('</(?:[^</>]+:)?(' + tags.join('|') + ')>');
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
