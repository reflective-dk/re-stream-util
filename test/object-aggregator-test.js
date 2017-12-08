"use strict";

var Promise = require('bluebird');
var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');

var restream = require('../index');

describe('objectAggregator', function() {
    describe('objectAggregator(plus)', function(done) {
        var objectAggregator = restream.objectAggregator;
        it('should aggregate objects', function(done) {
            expect(streamToPromise(
                streamify([ 1, 2, 3 ]).pipe(objectAggregator(plus))))
                .to.eventually.deep.equal([ 6 ]).notify(done);

            function plus(a, b) {
                return a + b;
            }
        });
    });

    describe('objectAggregator(plus)', function(done) {
        var objectAggregator = restream.objectAggregator;
        it('should aggregate by id', function(done) {
            expect(streamToPromise(
                streamify([
                    { id: 'odd', value: 1 },
                    { id: 'even', value: 2 },
                    { id: 'odd', value: 3 },
                    { id: 'even', value: 4 }
                ]).pipe(objectAggregator(plus))))
                .to.eventually.deep.equal([
                    { id: 'odd', value: 4 },
                    { id: 'even', value: 6 }
                ]).notify(done);

            function plus(a, b) {
                return {
                    id: a.id,
                    value: a.value + b.value
                };
            }
        });
    });

    describe('objectAggregator() with default aggFn', function(done) {
        var objectAggregator = restream.objectAggregator;
        it('should append object registrations', function(done) {
            expect(streamToPromise(
                streamify([
                    { id: 'foo', registrations: [ 1 ] },
                    { id: 'bar', registrations: [ 2 ] },
                    { id: 'foo', registrations: [ 3 ] },
                    { id: 'bar', registrations: [ 4 ] }
                ]).pipe(objectAggregator())))
                .to.eventually.deep.equal([
                    { id: 'foo', registrations: [ 1, 3 ] },
                    { id: 'bar', registrations: [ 2, 4 ] }
                ]).notify(done);
        });
    });
});
