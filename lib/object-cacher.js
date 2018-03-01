"use strict";

var Promise = require('bluebird');
var through2 = require('through2');
var pumpify = require('pumpify');
var ternary = require('ternary-stream');
var _ = require('lodash');
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

ObjectCacher.prototype.promise = function(input) {
    var objects = (input || {}).objects || [];
    switch (objects.length) {
    case 0:
        return Promise.resolve({ objects: [] });
    case 1:
        var hit = this.cache[objects[0].id];
        if (hit) {
            return Promise.resolve({ objects: [ hit ] });
        }
        // Else fall through to stream implementation
    default:
        return streamToPromise(
            streamify(objects)
                .pipe(wrap.wrapper())
                .pipe(this.stream()))
            .then(function(objs) {
                return JSON.parse(objs);
            });
    }
};

ObjectCacher.prototype.warmUp = function(stream) {
    var count = 0;
    return streamToPromise(
        stream
            .pipe(wrap.unwrapper())
            .pipe(cacheFetched(this.cache))
            .pipe(through2.obj(function(obj, enc, callback) {
                count++;
                callback();
            }, function(callback) {
                callback();
            }))
    ).then(function() { return true; });
};

ObjectCacher.prototype.findOne = function(query) {
    var predicate = buildQueryPredicate(query);
    var hit = _.find(this.cache, predicate);
    return Promise.resolve(hit);
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

function buildQueryPredicate(query) {
    var relatesTo = query.relatesTo || {};
    var keys = Object.keys(relatesTo);
    // Hardcoded valences for efficiency
    switch (keys.length) {
    case 0:
        return function() { return true; };
    case 1:
        return function(obj) {
            return _.get(obj, [ 'snapshot', keys[0], 'id' ]) === relatesTo[keys[0]];
        };
    case 2:
        return function(obj) {
            return _.get(obj, [ 'snapshot', keys[0], 'id' ]) === relatesTo[keys[0]]
                && _.get(obj, [ 'snapshot', keys[1], 'id' ]) === relatesTo[keys[1]];
        };
    case 3:
        return function(obj) {
            return _.get(obj, [ 'snapshot', keys[0], 'id' ]) === relatesTo[keys[0]]
                && _.get(obj, [ 'snapshot', keys[1], 'id' ]) === relatesTo[keys[1]]
                && _.get(obj, [ 'snapshot', keys[2], 'id' ]) === relatesTo[keys[2]];
        };
    default:
        throw new Error('max supported valence is 3: ' + query.toString());
    }
}
