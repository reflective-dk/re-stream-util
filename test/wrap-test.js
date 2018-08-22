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

describe('unwrapper/wrapper', function() {
    describe('unwrapper, then operation, then wrapper', function(done) {
        it('should unwrap a string, allow operation, and rewrap', function(done) {
            var statuses = {};
            expect(streamToPromise(
                streamify([ '{"objects":[1,2,3]}' ])
                    .pipe(restream.unwrapper())
                    .pipe(through2.obj(function(obj, enc, callback) {
                        statuses[obj] = 'status: ' + obj;
                        return callback(null, obj + 10);
                    }))
                    .pipe(restream.wrapper(statuses))
            )).to.eventually.deep.equal([
                '{"objects":[11',
                ',12',
                ',13',
                '],"1":"status: 1","2":"status: 2","3":"status: 3"}'
            ]).notify(done);
        });
    });

    describe('unwrapper', function(done) {
        it('should call onHeader and onFooter', function(done) {
            var meta = {};
            expect(streamToPromise(
                streamify([ '{"header":"foo","objects":[1,2,3],"footer":"bar"}' ])
                    .pipe(restream.unwrapper(null, m => _.merge(meta, m),
                                             m => _.merge(meta, m)))
            ).then(function() { return meta; }))
                .to.eventually.deep.equal({ header: 'foo', footer: 'bar' })
                .notify(done);
        });
    });

    describe('chained wrapping/unwrapping', function(done) {
        it('should wrap and unwrap several times without loosing objects or missing a wrap', function() {
          var stream = streamify([{ id: '1'},{id: '2'},{id:'3'}])
          .pipe(restream.wrapper())
          .pipe(through2())
          .pipe(restream.objectToStringStream())
          .pipe(restream.unwrapper())
          .pipe(through2.obj( function (object, encoding, callback) {
            if (object.id === '2') {
              this.push({ id: 'new'});
            }
            callback();
          }))
          .pipe(restream.objectToObjectStream())
          .pipe(restream.wrapper())
          .pipe(restream.unwrapper())
          .pipe(restream.wrapper())
          .pipe(through2());

          return streamToPromise(stream).then((buffer) => {
            assert.equal('{"objects":[{"id":"new"}]}', buffer.toString());
          });
        });
    });
});
