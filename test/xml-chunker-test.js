"use strict";

var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = chai.expect;
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');
var through2 = require('through2');

var restream = require('../index');

var chunkedIncompleteXml = fs.readFileSync(
  path.join(__dirname, '..', 'test-data', 'chunked-incomplete-job-positions.xml'),
  'utf8');
var chunkedIncompleteXml2 = fs.readFileSync(
  path.join(__dirname, '..', 'test-data', 'chunked-incomplete-job-positions2.xml'),
  'utf8');
var completeSoapResponse = fs.readFileSync(
  path.join(__dirname, '..', 'test-data', 'SOAP_Profession.xml'),
  'utf8');
var trickyChunks = fs.readFileSync(
  path.join(__dirname, '..', 'test-data', 'tricky-chunks.xml'),
  'utf8');
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
                run('<one></one>', [ '<one></one>' ])
            ])).notify(done);
        });

        it('should support multibyte characters across chunk boundaries', function(done) {
          // Multibyte: 'æ' = c3 a6
          // <one>0xc3|0xa6</one> => <one>æ</one>
          var chunk1 = Buffer.concat([ Buffer.from('<one>'), Buffer.from([ 0xc3 ]) ]);
          var chunk2 = Buffer.concat([ Buffer.from([ 0xa6 ]), Buffer.from('</one>') ]);
          expect(Promise.resolve(streamToPromise(streamify([chunk1, chunk2])
            .pipe(xmlChunker.apply(null, [ 'one' ]))
            .pipe(through2.obj((c, e, callback) => callback(null, c.toString()))))))
            .to.eventually.deep.equal([ '<one>æ</one>' ])
            .notify(done);
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
                run('<one><fee/><one><fi/><one><fo/><one><fum/></one><one><fum/></one></one></one></one>',
                    [ '<one><fee/><one><fi/><one><fo/><one><fum/></one><one><fum/></one></one></one></one>' ]),
                run(oneLineNestedXml(),
                    [ /<sd:Profession>[\s\S]+<\/sd:Profession>/.exec(oneLineNestedXml())[0] ],
                    [ 'Profession' ]),
                run(chunkedIncompleteXml, [], [ 'Profession' ]),
                run(chunkedIncompleteXml2, [], [ 'Profession' ]),
                run(completeSoapResponse, 104, [ 'Profession' ], r => r.length),
                run(invalidNestedXml(), [], [ 'Profession' ]),
                run(trickyChunks, 3, [ 'Profession' ], r => r.length),
                run('<outside><one><one></one></one><outside>',
                    [ '<one><one></one></one>' ])
            ])).notify(done);
        });

        it('should allow nested elements in a long file', function(done) {
          var xml = fs.createReadStream('test-data/SOAP_Profession.xml');
          expect(Promise.resolve(streamToPromise(
            xml.pipe(xmlChunker.apply(null, [ 'Profession' ]))
              .pipe(through2.obj((c, e, callback) => callback(null, c.toString())))
          ))).to.eventually.have.lengthOf(104)
            .notify(done);
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

      function run(input, output, tags, then) {
        then = then || (r => r);
        tags = tags || [ 'one', 'two' ];
        var chunks = [];
        return expect(Promise.resolve(streamToPromise(
          streamify(input.split('|'))
            .pipe(xmlChunker.apply(null, tags))
            .pipe(through2.obj((c, e, callback) => callback(null, c.toString())))
        )).then(then)).to.eventually.deep.equal(output);
      }

      function oneLineNestedXml() {
        return '<?xml version="1.0" encoding="UTF-8"?>\
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\
  <soapenv:Body>\
    <sd:GetProfession20080201 xmlns:sd="http://rep.oio.dk/sd.dk/xml.schema/20080201/" xsi:schemaLocation="http://rep.oio.dk/sd.dk/xml.schema/20080201/ https://service.sd.dk/sdws/xml/schema/sd.dk/xml.schema/20080201/SD_GetProfessionInterface.xsd" xmlns:sd20070301="http://rep.oio.dk/sd.dk/xml.schema/20070301/" xmlns:sd20070401="http://rep.oio.dk/sd.dk/xml.schema/20070401/" creationTime="2020-09-29T10:42:51">\
      <sd:RequestKey>\
        <sd20070301:InstitutionIdentifier>TS</sd20070301:InstitutionIdentifier>\
      </sd:RequestKey>\
      <sd:Profession>\
        <sd:JobPositionIdentifier>1002</sd:JobPositionIdentifier>\
        <sd:JobPositionName>Pers. U. ledel</sd:JobPositionName>\
        <sd:JobPositionLevelCode>3</sd:JobPositionLevelCode>\
        <sd:Profession>\
          <sd:JobPositionIdentifier>1400</sd:JobPositionIdentifier>\
          <sd:JobPositionName>Øvrigt pers.</sd:JobPositionName>\
          <sd:JobPositionLevelCode>2</sd:JobPositionLevelCode>\
          <sd:Profession>\
            <sd:JobPositionIdentifier>6101</sd:JobPositionIdentifier>\
            <sd:JobPositionName>61.01 PædMedhj</sd:JobPositionName>\
            <sd:JobPositionLevelCode>1</sd:JobPositionLevelCode>\
            <sd:Profession>\
              <sd:JobPositionIdentifier>7040</sd:JobPositionIdentifier>\
              <sd:JobPositionName>Børnhvkl.medhj</sd:JobPositionName>\
              <sd:JobPositionLevelCode>0</sd:JobPositionLevelCode>\
            </sd:Profession>\
            <sd:Profession>\
              <sd:JobPositionIdentifier>7070</sd:JobPositionIdentifier>\
              <sd:JobPositionName>Pæd.medhjælper</sd:JobPositionName>\
              <sd:JobPositionLevelCode>0</sd:JobPositionLevelCode>\
            </sd:Profession>\
            <sd:Profession>\
              <sd:JobPositionIdentifier>7075</sd:JobPositionIdentifier>\
              <sd:JobPositionName>Pæd. assistent</sd:JobPositionName>\
              <sd:JobPositionLevelCode>0</sd:JobPositionLevelCode>\
            </sd:Profession>\
          </sd:Profession>\
        </sd:Profession>\
      </sd:Profession>\
    </sd:GetProfession20080201>\
  </soapenv:Body>\
</soapenv:Envelope>';
      }

      // This XML deliberately misses two close tags, and has a number of splits '|'
      // to create multiple chunks in order to test proper behavior of nested counting
      function invalidNestedXml() {
          return '<sd:Profession>\n\
        <sd:JobPositionIdentifier>1001</sd:JobPositionIdentifier>\n\
      | <sd:JobPositionName>Ledere</sd:JobPositionName>\n\
        <sd:JobPositionLevelCode>3</sd:JobPositionLevelCode>\n\
        <sd:Profession>\n\
          <sd:JobPositionIdentifier>1100</sd:JobPositionIdentifier>\n\
      |   <sd:JobPositionName>Kommunaldirek.</sd:JobPositionName>\n\
          <sd:JobPositionLevelCode>2</sd:JobPositionLevelCode>\n\
          <sd:Profession>\n\
            <sd:JobPositionIdentifier>3001</sd:JobPositionIdentifier>\n\
      |     <sd:JobPositionName>30.01 Chefaft.</sd:JobPositionName>\n\
            <sd:JobPositionLevelCode>1</sd:JobPositionLevelCode>\n\
            <sd:Profession>\n\
              <sd:JobPositionIdentifier>3335</sd:JobPositionIdentifier>\n\
      |       <sd:JobPositionName>Kommunal.dir.</sd:JobPositionName>\n\
              <sd:JobPositionLevelCode>0</sd:JobPositionLevelCode>\n\
            </sd:Profession>\n';
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
