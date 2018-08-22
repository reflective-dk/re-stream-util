"use strict";

var Transform = require('stream').Transform;

module.exports = {
  objectToStringStream: function () {
    return new Transform({
      writableObjectMode: true,
      transform(chunk, encoding, callback) {
        this.push(chunk);
        callback();
      }
    });
  },
  objectToObjectStream: function () {
    return new Transform({
      writableObjectMode: true,
      readableObjectMode: true,
      transform(object, encoding, callback) {
        this.push(object);
        callback();
      }
    });
  }
};