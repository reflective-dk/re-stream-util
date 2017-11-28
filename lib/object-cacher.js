"use strict";

var through2 = require('through2');
var pumpify = require('pumpify');
var ternary = require('ternary-stream');
var streamify = require('stream-array');
var streamToPromise = require('stream-to-promise');
var wrap = require('./wrap');

module.exports = ObjectCacher;

function ObjectCacher(streamFactory, context) {
    this.factory = streamFactory;
    this.context = context;
    this.cache = {};
}

ObjectCacher.prototype.stream = function() {
    var fetcher = pumpify.obj(
        wrap.wrapper(),
        this.factory(this.context),
        wrap.unwrapper(),
        cacheFetched(this.cache)
    );
    return pumpify(
        wrap.unwrapper(),
        hitElseBlank(this.cache),
        ternary(isBlank, fetcher),
        wrap.wrapper()
    );
};

ObjectCacher.prototype.promise = function(objects) {
    return streamToPromise(
        streamify(objects.objects)
            .pipe(wrap.wrapper())
            .pipe(this.stream()))
        .then(function(objs) {
            return JSON.parse(objs);
        });
};

function hitElseBlank(cache) {
    return through2.obj(function(obj, enc, callback) {
        var hit = cache[obj.id];
        this.push(hit ? JSON.parse(JSON.stringify(hit)) : { id: obj.id });
        callback();
    });
}

function isBlank(obj) {
    return !obj.snapshot;
}

function cacheFetched(cache) {
    return through2.obj(function(obj, enc, callback) {
        cache[obj.id] = obj;
        this.push(obj);
        callback();
    });
}
