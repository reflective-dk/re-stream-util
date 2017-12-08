"use strict";

var ObjectCacher = require('./lib/object-cacher');
var wrap = require('./lib/wrap');
var xmlChunker = require('./lib/xml-chunker');
var objectAggregator = require('./lib/object-aggregator');

module.exports = {
    ObjectCacher: ObjectCacher,
    wrapper: wrap.wrapper,
    unwrapper: wrap.unwrapper,
    xmlChunker: xmlChunker,
    objectAggregator: objectAggregator
};
