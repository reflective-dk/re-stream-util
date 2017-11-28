"use strict";

var ObjectCacher = require('./lib/object-cacher');
var wrap = require('./lib/wrap');

module.exports = {
    ObjectCacher: ObjectCacher,
    wrapper: wrap.wrapper,
    unwrapper: wrap.unwrapper
};
