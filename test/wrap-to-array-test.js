"use strict";

var chai = require('chai');
chai.use(require('chai-as-promised'));
var assert = chai.assert;
var expect = chai.expect;
var _ = require('lodash');
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');
var through2 = require('through2');

var restream = require('../index');

describe('wrap-to-array', function() {
  it('should wrap to valid JSON array', function() {
    var stream = streamify([{ id: '1'},{id: '2'},{id:'3'}])
    .pipe(restream.wrapToArray());

    return streamToPromise(stream).then((buffer) => {
      assert.equal(buffer.join(''), '[{"id":"1"},{"id":"2"},{"id":"3"}]');
    });
  });
});
