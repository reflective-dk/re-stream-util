"use strict";

var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;

var pumpify = require('pumpify');
var streamify = require('stream-array');
var through2 = require('through2');
var streamToPromise = require('stream-to-promise');
var reStream = require('../index');

describe('ObjectCacher', function() {
    before(_before);

    describe('stream()', function() {
        it('should cache objects on first read', function(done) {
            this.cacher.context = 'foo';
            var promise = streamToPromise(
                streamify([ { id: '1' }, { id: '2' }, { id: '3' } ])
                    .pipe(reStream.wrapper())
                    .pipe(this.cacher.stream())
            ).then(function(result) { return JSON.parse(result).objects; });
            expect(promise).to.eventually.have.same.deep.members([
                    { id: '1', snapshot: { name: 'foo' } },
                    { id: '2', snapshot: { name: 'foo' }  },
                    { id: '3', snapshot: { name: 'foo' }  }
                ]).notify(done);
        });

        it('should not reread objects already cached', function(done) {
            this.cacher.context = 'bar';
            var promise = streamToPromise(
                streamify([ { id: '1' }, { id: '2' }, { id: '3' } ])
                    .pipe(reStream.wrapper())
                    .pipe(this.cacher.stream())
            ).then(function(result) { return JSON.parse(result).objects; });
            expect(promise).to.eventually.have.same.deep.members([
                    { id: '1', snapshot: { name: 'foo' } },
                    { id: '2', snapshot: { name: 'foo' }  },
                    { id: '3', snapshot: { name: 'foo' }  }
                ]).notify(done);
        });

        it('should read objects not in cache', function(done) {
            this.cacher.context = 'baz';
            var promise = streamToPromise(
                streamify([ { id: '1' }, { id: '25' }, { id: '3' } ])
                    .pipe(reStream.wrapper())
                    .pipe(this.cacher.stream())
            ).then(function(result) { return JSON.parse(result).objects; });
            expect(promise).to.eventually.have.same.deep.members([
                    { id: '1', snapshot: { name: 'foo' } },
                    { id: '25', snapshot: { name: 'baz' }  },
                    { id: '3', snapshot: { name: 'foo' }  }
                ]).notify(done);
        });
    });

    describe('promise(objects)', function() {
        it('should cache objects on first read', function(done) {
            this.cacher.context = 'foo';
            var objects = {
                objects: [ { id: '1' }, { id: '2' }, { id: '3' } ]
            };
            var promise = this.cacher.promise(objects)
                .then(function(result) { return result.objects; });
            expect(promise).to.eventually.have.same.deep.members([
                    { id: '1', snapshot: { name: 'foo' } },
                    { id: '2', snapshot: { name: 'foo' }  },
                    { id: '3', snapshot: { name: 'foo' }  }
                ]).notify(done);
        });

        it('should not reread objects already cached', function(done) {
            this.cacher.context = 'bar';
            var objects = {
                objects: [ { id: '1' }, { id: '2' }, { id: '3' } ]
            };
            var promise = this.cacher.promise(objects)
                .then(function(result) { return result.objects; });
            expect(promise).to.eventually.have.same.deep.members([
                    { id: '1', snapshot: { name: 'foo' } },
                    { id: '2', snapshot: { name: 'foo' }  },
                    { id: '3', snapshot: { name: 'foo' }  }
                ]).notify(done);
        });

        it('should read objects not in cache', function(done) {
            this.cacher.context = 'baz';
            var objects = {
                objects: [ { id: '1' }, { id: '25' }, { id: '3' } ]
            };
            var promise = this.cacher.promise(objects)
                .then(function(result) { return result.objects; });
            expect(promise).to.eventually.have.same.deep.members([
                    { id: '1', snapshot: { name: 'foo' } },
                    { id: '25', snapshot: { name: 'baz' }  },
                    { id: '3', snapshot: { name: 'foo' }  }
                ]).notify(done);
        });
    });
});

function _before() {
    var i = 0;
    this.cacher = new reStream.ObjectCacher(namer, 'noname');

    function namer(name) {
        return pumpify(
            reStream.unwrapper(),
            through2.obj(function(obj, enc, callback) {
                obj.snapshot = { name: name };
                this.push(obj);
                callback();
            }),
            reStream.wrapper()
        );
    };
}
