"use strict";

var through2 = require('through2');

module.exports = objectAggregator;

function objectAggregator(aggFn) {
    aggFn = aggFn || appendRegistration;
    var seen = {};
    return through2.obj(function (obj, enc, callback) {
        // Nothing is pushed downstream while data is trickling in
        var current = seen[obj.id];
        var next = current ? aggFn(current, obj) : obj;
        seen[next.id] = next;
        callback();
    }, function(callback) {
        // Everything is pushed downstream at the end
        var self = this;
        Object.keys(seen).forEach(function(k) {
            self.push(seen[k]);
        });
        callback();
    });
}

function appendRegistration(current, newo) {
    if (current === newo) {
        return current;
    }
    var reg = JSON.parse(JSON.stringify(newo.registrations[0]));
    current.registrations.push(reg);
    return current;
}
