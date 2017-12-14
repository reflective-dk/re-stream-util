"use strict";

var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');

var restream = require('../index');

describe('projection', function() {
    describe('projection(propName1, ..., propNameN)', function(done) {
        it('should reduce properties of objects to specified set', function(done) {
            expect(streamToPromise(
                streamify([
                    { a: 1, b: 'abc', c: 3 },
                    { a: 'qwe', c: 42 },
                    {}
                ]).pipe(restream.projection('b', 'c'))))
                .to.eventually.deep.equal([
                    { b: 'abc', c: 3 },
                    { c: 42 },
                    {}
                ]).notify(done);
        });
    });
});
