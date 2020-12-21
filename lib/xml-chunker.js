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
    var buffer = Buffer.from('');
    var openMatch, nestedMatch, endMatch, endsAt, nestedSkip, endSkip;
    var nestedLevels = 0;
    return through2(function(chunk, enc, callback) {
        buffer = Buffer.concat([ buffer, chunk ]);
        while (true) {
            var asString = buffer.toString();
            openMatch = openMatch || match(open, asString);
            if (!openMatch) {
                // Nothing interesting - exit and await next chunk of text
                return callback();
            }
            if (selfClosing(openMatch)) {
                // Self-closing - push element and wrap around to look for more
                endsAt = openMatch.index + openMatch.tag.length;
                this.push(openMatch.tag);
                buffer = buffer.slice(endsAt);
                openMatch = null;
                continue;
            }
            endSkip = endMatch ? (endMatch.index + endMatch.tag.length)
                : endSkip || (openMatch.index + openMatch.tag.length);
            endMatch = match(end, asString, endSkip);
            if (!endMatch) {
                // Cannot close element yet - exit and await next chunk of text
                return callback();
            }
            nestedSkip = nestedMatch ? (nestedMatch.index + nestedMatch.tag.length)
                : nestedSkip || (openMatch.index + openMatch.tag.length);
            nestedMatch = match(open, asString, nestedSkip);
            if (nestedMatch && (openMatch.name == nestedMatch.name) &&
                nestedMatch.index < endMatch.index) {
              nestedLevels++;
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
            this.push(asString.substring(openMatch.index, endsAt));
            buffer = buffer.slice(endsAt);
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
