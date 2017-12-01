"use strict";

var chai = require('chai');
var expect = chai.expect;
var streamify = require('stream-array');

describe('XML Chunking', function() {
    describe('xmlChunker(tags)', function() {
        it('should chop up an XML stream so each chunk becomes a complete element', function() {
        });

        it('should only pass on elements with the specified tags', function() {
        });

        it('should throw an error if no tags are specified', function() {
        });

        it('should throw an error if the XML elements are interleaved or nested', function() {
        });
    });

    describe('openPattern(tags)', function() {
        it('should match open tags of a single kind', function() {
        });

        it('should match open tags of multiple kinds', function() {
        });

        it('should match self-closing tags', function() {
        });

        it('should not match end tags', function() {
        });
    });

    describe('endPattern(tags)', function() {
        it('should match end tags of a single kind', function() {
        });

        it('should match end tags of multiple kinds', function() {
        });

        it('should not match self-closing tags', function() {
        });

        it('should not match open tags', function() {
        });
    });

    describe('match(pattern, string)', function() {
        it('should return a match object when there is a match', function() {
        });

        it('should return null when there is no match', function() {
        });
    });

    describe('selfClosing(match)', function() {
        it('should return true when the tag is self-closing', function() {
        });

        it('should return false when the tag is not self-closing', function() {
        });
    });
});
