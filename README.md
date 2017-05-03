# asset-pipe-client

A client for read an [CommonJS module][commonjs] entry point and uploading it as an asset feeds to- and
triggering builds of executable asset bundles in the [asset-pipe-build-server][asset-pipe-build-server].

Creating asset bundles with [asset-pipe][asset-pipe] is a two step process. The first step is to upload
an asset feed to the [asset-pipe-build-server][asset-pipe-build-server]. On an upload the asset-feed
will be persisted and the [asset-pipe-build-server][asset-pipe-build-server] will return the generated
filename of the uploaded asset-feed.

The second step is then to create a bundle out of one or multiple asset-feeds. This is done by providing
the unique ID(s) of the asset-feeds one want to use to build an asset bundle to the
[asset-pipe-build-server][asset-pipe-build-server]. The build server will then create an executable asset
bundle out of these asset-feeds and persist this. It will respond with the URL to the bundle.

This client helps with remotly triggering these steps in the [asset-pipe-build-server][asset-pipe-build-server].



## Installation

```bash
$ npm install asset-pipe-client
```



## Example I

Read an [CommonJS module][commonjs] entry point and upload it as an asset-feed to the
[asset-pipe-build-server][asset-pipe-build-server]:

```js
const Client = require('asset-pipe-client');

const client = new Client({
    buildServerUri: 'http://127.0.0.1:7100',
});

client.uploadFeed(['path/to/myFrontendCode.js'])
    .then((content) => {
        // content contains filename of created the asset-feed
        console.log(content);
    })
    .catch((error) => {
        console.log(error);
    });
```


## Example II

Build an javascript bundle out of two asset feeds:

```js
const Client = require('asset-pipe-client');
const client = new Client({
    buildServerUri: 'http://127.0.0.1:7100',
});

bundle.createRemoteBundle([
        'f09a737b36b7ca19a224e0d78cc50222d636fd7af6f7913b01521590d0d7fe02.json',
        'c50ca03a63650502e1b72baf4e493d2eaa0e4aa38aa2951825e101b1d6ddb68b.json'
    ])
    .then((content) => {
        // content contains URI to the created bundle
        console.log(content);
    })
    .catch((error) => {
        console.log(error);
    });
```



## API

Under the hood, the [asset-pipe][asset-pipe] project build on [browserify][Browserify]. Multiple methods
in this module are therefor underlaying Browserify methods where all features found in Browserify can
be used. Such methods will in this documentation point to the related documentation in Browserify.

This module have the following API:

### constructor(options)

Supported arguments are:

 * `options.buildServerUri` - URI to the [asset-pipe-build-server][asset-pipe-build-server]

### transform()

Same as the [Browserify transform][browserify-transform] method.

### plugin()

Same as the [Browserify plugin][browserify-plugin] method.

### uploadFeed(files)

Read the [CommonJS module][commonjs] entry point and uploads it as an asset feeds to the [asset-pipe-build-server][asset-pipe-build-server].

 * `files` - Array - List of CommonJS module entry points - Same as `files` in the [Browserify constructor][browserify-opts]

Returns a promise.

### createRemoteBundle(feeds)

Creates an asset bundle on the [asset-pipe-build-server][asset-pipe-build-server].

 * `feeds` - Array - List of asset-feed filenames.



## Transpilers

Since [asset-pipe][asset-pipe] is built on [browserify][Browserify] under the hood, its fully possible
to take advantage of the different transpiers available for [browserify][Browserify].

As an example, here is how Babel is applied:

```js
const babelify = require('babelify');
const Client = require('asset-pipe-client');

const client = new Client({
    files: ['path/to/myES6FrontendCode.js']
    buildServerUri: 'http://127.0.0.1:7100',
});

client.transform(babelify, { presets: ['es2015'] });

client.uploadFeed()
    .then((content) => {
        console.log(content);
    })
    .catch((error) => {
        console.log(error);
    });
```



## License

The MIT License (MIT)

Copyright (c) 2017 - Trygve Lie - post@trygve-lie.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.



[commonjs]: https://nodejs.org/docs/latest/api/modules.html
[asset-pipe]: https://github.com/asset-pipe
[asset-pipe-build-server]: https://github.com/asset-pipe/asset-pipe-build-server
[browserify]: https://github.com/substack/node-browserify
[browserify-opts]: https://github.com/substack/node-browserify#browserifyfiles--opts
[browserify-plugin]: https://github.com/substack/node-browserify#bpluginplugin-opts
[browserify-transform]: https://github.com/substack/node-browserify#btransformtr-opts
