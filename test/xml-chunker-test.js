"use strict";

var Promise = require('bluebird');
var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');
var through2 = require('through2');

var restream = require('../index');

describe('XML Chunking', function() {
    describe('xmlChunker(tags)', function(done) {
        var xmlChunker = restream.xmlChunker;
        it('should chop up an XML stream so each chunk becomes a complete element', function(done) {
            expect(Promise.all([
                run('<one></one>', [ '<one></one>' ]),
                run('<one>|</one>', [ '<one></one>' ]),
                run('<one></|one>', [ '<one></one>' ]),
                run('<one></one><two></two>', [ '<one></one>', '<two></two>' ]),
                run('<one|>|</one><tw|o>|</two>', [ '<one></one>', '<two></two>' ])
            ])).notify(done);
        });

        it('should only pass on elements with the specified tags', function(done) {
            expect(Promise.all([
                run('<yin></yin><one></one><yang></yang>', [ '<one></one>' ])
            ])).notify(done);
        });

        it('should pass on elements embedded inside the specified tags', function(done) {
            expect(Promise.all([
                run('<one>|<another></another>|</one>', [ '<one><another></another></one>' ])
            ])).notify(done);
        });

        it('should match on outermost element and include nested as contents', function(done) {
            expect(Promise.all([
                run('<one><two><inside></inside></two></one>',
                    [ '<one><two><inside></inside></two></one>' ]),
                run('<outside><two><one></one></two><outside>',
                    [ '<two><one></one></two>' ])
            ])).notify(done);
        });

        it('should allow nested elements of same type as contents', function(done) {
            expect(Promise.all([
                run('<one><one><inside></inside></one></one>',
                    [ '<one><one><inside></inside></one></one>' ]),
                run('<one></one><one><one><inside></inside></one></one>',
                    [ '<one></one>', '<one><one><inside></inside></one></one>' ]),
                run('<one><one></one><one><inside></inside></one></one><one></one>',
                    [ '<one><one></one><one><inside></inside></one></one>', '<one></one>' ]),
                run('<one><fee/><one><fi/><one><fo/><one><fum/></one></one></one></one>',
                    [ '<one><fee/><one><fi/><one><fo/><one><fum/></one></one></one></one>' ]),
                run('<outside><one><one></one></one><outside>',
                    [ '<one><one></one></one>' ])
            ])).notify(done);
        });

        it('should pass on self-closing elements', function(done) {
            expect(Promise.all([
                run('<one/><one /><two att="value"/>',
                    [ '<one/>', '<one />', '<two att="value"/>' ])
            ])).notify(done);
        });

        it('should throw an error if no tags are specified', function() {
            expect(function() { xmlChunker(); })
                .to.throw('at least one XML tag must be specified');
        });

      function run(input, output) {
          var chunks = [];
        return expect(Promise.resolve(streamToPromise(
          streamify(input.split('|'))
            .pipe(xmlChunker('one', 'two'))
            .pipe(through2.obj((c, e, callback) => callback(null, c.toString())))
        ))).to.eventually.deep.equal(output);
      }
    });

    describe('openPattern(tags)', function() {
        var openPattern = restream.xmlChunker.openPattern;
        it('should match one open tag of a single kind', function() {
            var pattern = openPattern([ 'one' ]);
            expect(pattern.exec('<one>')).to.deep.equal([ '<one>', 'one' ]);
            expect(pattern.exec('<one>').index).to.equal(0);
            expect(pattern.exec('<another><one><a-third>')).to.deep.equal([ '<one>', 'one' ]);
            expect(pattern.exec('<another><one><a-third>').index).to.equal(9);
            expect(pattern.test('<one >')).to.equal(true);
            expect(pattern.test('<one attribute="value">')).to.equal(true);
            expect(pattern.test('')).to.equal(false);
            expect(pattern.test('<another>')).to.equal(false);
        });

        it('should match one open tag of multiple kinds', function() {
            var pattern = openPattern([ 'one', 'two' ]);
            expect(pattern.exec('<one>')).to.deep.equal([ '<one>', 'one' ]);
            expect(pattern.exec('<one>').index).to.equal(0);
            expect(pattern.exec('<two><one>')).to.deep.equal([ '<two>', 'two' ]);
            expect(pattern.exec('<two><one>').index).to.equal(0);
            expect(pattern.exec('<another><one><a-third>')).to.deep.equal([ '<one>', 'one' ]);
            expect(pattern.exec('<another><one><a-third>').index).to.equal(9);
            expect(pattern.test('<one >')).to.equal(true);
            expect(pattern.test('<two attribute="value">')).to.equal(true);
            expect(pattern.test('')).to.equal(false);
            expect(pattern.test('<another>')).to.equal(false);
        });

        it('should match self-closing tags', function() {
            var pattern = openPattern([ 'one', 'two' ]);
            expect(pattern.exec('<one/>')).to.deep.equal([ '<one/>', 'one' ]);
            expect(pattern.exec('<one/>').index).to.equal(0);
            expect(pattern.exec('<two/><one/>')).to.deep.equal([ '<two/>', 'two' ]);
            expect(pattern.exec('<two/><one/>').index).to.equal(0);
            expect(pattern.exec('<another><one/><a-third>')).to.deep.equal([ '<one/>', 'one' ]);
            expect(pattern.exec('<another><one/><a-third>').index).to.equal(9);
            expect(pattern.test('<one />')).to.equal(true);
            expect(pattern.test('<one attribute="value"/>')).to.equal(true);
            expect(pattern.test('')).to.equal(false);
            expect(pattern.test('<another/>')).to.equal(false);
        });

        it('should not match end tags', function() {
            var pattern = openPattern([ 'one', 'two' ]);
            expect(pattern.test('</one>')).to.equal(false);
            expect(pattern.test('</two>')).to.equal(false);
            expect(pattern.test('</one></two>')).to.equal(false);
        });

        it('should not match longer tags where a specified tag is a prefix', function() {
            var pattern = openPattern([ 'one', 'two' ]);
            expect(pattern.test('<ones>')).to.equal(false);
            expect(pattern.test('<onetwo>')).to.equal(false);
        });
    });

    describe('endPattern(tags)', function() {
        var endPattern = restream.xmlChunker.endPattern;
        it('should match one end tag of a single kind', function() {
            var pattern = endPattern([ 'one' ]);
            expect(pattern.exec('</one>')).to.deep.equal([ '</one>', 'one' ]);
            expect(pattern.exec('</one>').index).to.equal(0);
            expect(pattern.exec('<another></one><a-third>')).to.deep.equal([ '</one>', 'one' ]);
            expect(pattern.exec('<another></one><a-third>').index).to.equal(9);
            expect(pattern.test('</one >')).to.equal(false);
            expect(pattern.test('</one attribute="value">')).to.equal(false);
            expect(pattern.test('')).to.equal(false);
            expect(pattern.test('</another>')).to.equal(false);
        });

        it('should match one end tag of multiple kinds', function() {
            var pattern = endPattern([ 'one', 'two' ]);
            expect(pattern.exec('</one>')).to.deep.equal([ '</one>', 'one' ]);
            expect(pattern.exec('</one>').index).to.equal(0);
            expect(pattern.exec('</two></one>')).to.deep.equal([ '</two>', 'two' ]);
            expect(pattern.exec('</two></one>').index).to.equal(0);
            expect(pattern.exec('<another></one><a-third>')).to.deep.equal([ '</one>', 'one' ]);
            expect(pattern.exec('<another></one><a-third>').index).to.equal(9);
            expect(pattern.test('</one >')).to.equal(false);
            expect(pattern.test('</two attribute="value">')).to.equal(false);
            expect(pattern.test('')).to.equal(false);
            expect(pattern.test('</another>')).to.equal(false);
        });

        it('should not match self-closing tags', function() {
            var pattern = endPattern([ 'one', 'two' ]);
            expect(pattern.test('<one/>')).to.equal(false);
            expect(pattern.test('<two/><one/>')).to.deep.equal(false);
        });

        it('should not match open tags', function() {
            var pattern = endPattern([ 'one', 'two' ]);
            expect(pattern.test('<one>')).to.equal(false);
            expect(pattern.test('<one><two>')).to.equal(false);
        });

        it('should not match longer tags where a specified tag is a prefix', function() {
            var pattern = endPattern([ 'one', 'two' ]);
            expect(pattern.test('</ones>')).to.equal(false);
            expect(pattern.test('</onetwo>')).to.equal(false);
        });
    });

    describe('match(pattern, string)', function() {
        var match = restream.xmlChunker.match;
        var pattern = restream.xmlChunker.openPattern([ 'one' ]);
        it('should return a match object when there is a match', function() {
            expect(match(pattern, '<one>')).to.deep.equal({
                tag: '<one>',
                name: 'one',
                index: 0
            });
        });

        it('should return null when there is no match', function() {
            expect(match(pattern, '<another>')).to.equal(null);
        });
    });

    describe('selfClosing(match)', function() {
        var selfClosing = restream.xmlChunker.selfClosing;
        it('should return true when the tag is self-closing', function() {
            expect(selfClosing({ tag: '<one/>' })).to.equal(true);
            expect(selfClosing({ tag: '<one />' })).to.equal(true);
            expect(selfClosing({ tag: '<one attribute="value"/>' })).to.equal(true);
        });

        it('should return false when the tag is not self-closing', function() {
            expect(selfClosing({ tag: '' })).to.equal(false);
            expect(selfClosing({ tag: '<one>' })).to.equal(false);
            expect(selfClosing({ tag: '</one>' })).to.equal(false);
            expect(selfClosing({ tag: '<one/ >' })).to.equal(false);
        });
    });
});
