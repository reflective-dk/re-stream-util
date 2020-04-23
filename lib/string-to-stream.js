"use strict";

var Readable = require('stream').Readable;

module.exports = stringToStream;

function stringToStream(string) {
    var stream = new Readable();
    stream._read = () => {};
    stream.push(string);
    stream.push(null);
    return stream;
}
