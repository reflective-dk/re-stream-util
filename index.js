"use strict";

var ObjectCacher = require('./lib/object-cacher');
var wrap = require('./lib/wrap');
var xmlChunker = require('./lib/xml-chunker');
var objectAggregator = require('./lib/object-aggregator');
var projection = require('./lib/projection');
var logger = require('./lib/logger');
var regexpChunker = require('./lib/regexp-chunker');
var splitChunker = require('./lib/split-chunker');
var streamModeHandlers = require('./lib/stream-mode-handlers');

module.exports = {
    ObjectCacher: ObjectCacher,
    wrapper: wrap.wrapper,
    unwrapper: wrap.unwrapper,
    xmlChunker: xmlChunker,
    regexpChunker: regexpChunker,
    splitChunker: splitChunker,
    objectAggregator: objectAggregator,
    objectToStringStream: streamModeHandlers.objectToStringStream,
    objectToObjectStream: streamModeHandlers.objectToObjectStream,
    projection: projection,
    logger: logger
};
