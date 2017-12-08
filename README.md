## Stream Utilities ##

This module contains a collection of utilities for working with stream operations
on the Reflective platform.

### Getting started ###

Follow these steps to get the code and check that the basic functionality is
working.

```
git clone git@github.com:reflective-dk/re-stream-util.git
cd re-stream-util
npm install
npm test
```

### ObjectCacher ###

#### new ObjectCacher(streamFactory, context) ####

The `ObjectCacher` class creates a caching context for any stream operation that
accepts the `'{ "objects": [ { "id": <uuid> }, ... ] }'` structure used
consistently across the Reflective platform.

An object requested from the cacher will be fetched exactly once and then
cached. Objects are fetched from streams constructed by the the _stream factory_
supplied to the constructor.

#### ObjectCacher.prototype.stream() ####

This function creates a duplex stream that can be piped to and from like any other
Node.js stream. Input piped to this stream creates the same output as if it had
been piped into a stream created by the stream factory passed into the
constructor, with two exceptions:

* The ordering of the output may not be the same
* The objects are cached and will therefore not reflect changes made since they
  were fetched

###### Usage: ######

```
var api = new (require('reflective-api'))();
var context = '{ "domain": "base" }';
var ObjectCacher = require('re-stream-util').ObjectCacher;

// Using the cacher to fetch objects only once
var cacher = new ObjectCacher(api.index.snapshot, { context: context });
return request
    .pipe(cacher.stream())
    .pipe(response);

// Using vanilla reflective-api
return request
    .pipe(api.index.snapshot, { context: context })
    .pipe(response);
```

#### ObjectCacher.prototype.promise(objects) ####

This function uses the stream interface internally and basically wraps the
output in a promise.

###### Usage: ######

```
var api = new (require('reflective-api'))();
var context = '{ "domain": "base" }';
var ObjectCacher = require('re-stream-util').ObjectCacher;

// Using the cacher to fetch objects only once
var cacher = new ObjectCacher(api.index.snapshot, { context: context });
return cacher.promise(objects)
    .then(function(result) { ... });

// Using vanilla reflective-api
return api.promise.index.snapshot({ context: context, objects: objects })
    .then(function(result) { ... });
```

### Chunking XML ###

#### xmlChunker(tagName1, ..., tagNameN) ####

Creates a very simple XML chunker that pushes complete nodes downstream
as text, regardless of how they were chunked coming in.

* At least one tag name is required, more than one can be specified
* Only the specified nodes are pushed downstream
* The specified nodes must not be nested

```
var restream = require('re-stream-util');
var xmlObjects = require('xml-objects');
return request
    .pipe(restream.xmlChunker(tagName1, ..., tagNameN))
    .pipe(xmlObjects({explicitRoot: false, explicitArray: false, mergeAttrs: true}))
    .pipe(restream.wrapper())
    .pipe(response);
```

### Aggregating objects repeated in a stream ###

#### objectAggregator(aggFn) ####

Creates a stream that will collect all input before pushing any of it
downstream. This is necessary when the same objects appear several times in the
input stream and their contents must be aggregated.

The `objectAggregator()` stream can be created without providing an aggregation
function, in which case the default behavior collects the first registration each
time an object is seen in the input stream.


```
var restream = require('re-stream-util');
return request
    .pipe(restream.unwrapper())
    .pipe(restream.objectAggregator())
    .pipe(restream.wrapper())
    .pipe(response);
```

### Wrapping/Unwrapping object streams ###

#### wrapper() ####

Creates a duplex stream that turns an object-based stream of individual objects
`{ id: <uuid> }` into a string-based stream of `'{ "objects":
[ { "id": <uuid> }, ... ] }'`.

###### Usage: ######

```
var restream = require('re-stream-util');
return request
    .pipe(restream.unwrapper())
    .pipe(someObjectBasedTransformation())
    .pipe(restream.wrapper())
    .pipe(response);
```

#### unwrapper() ####

Creates a duplex stream that turns a string-based stream of `'{ "objects":
[ { "id": <uuid> }, ... ] }'` into an object-based stream where each chunk is an
object: `{ id: <uuid> }`.

###### Usage: ######

```
var restream = require('re-stream-util');
return request
    .pipe(restream.unwrapper())
    .pipe(someObjectBasedTransformation())
    .pipe(restream.wrapper())
    .pipe(response);
```
