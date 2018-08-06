<!-- TITLE/ -->

<h1>@asset-pipe/client</h1>

<!-- /TITLE -->


<!-- BADGES/ -->

<span class="badge-travisci"><a href="http://travis-ci.org/asset-pipe/asset-pipe-client" title="Check this project's build status on TravisCI"><img src="https://img.shields.io/travis/asset-pipe/asset-pipe-client/master.svg" alt="Travis CI Build Status" /></a></span>
<span class="badge-npmversion"><a href="https://npmjs.org/package/@asset-pipe/client" title="View this project on NPM"><img src="https://img.shields.io/npm/v/@asset-pipe/client.svg" alt="NPM version" /></a></span>
<span class="badge-daviddm"><a href="https://david-dm.org/asset-pipe/asset-pipe-client" title="View the status of this project's dependencies on DavidDM"><img src="https://img.shields.io/david/asset-pipe/asset-pipe-client.svg" alt="Dependency Status" /></a></span>
<span class="badge-daviddmdev"><a href="https://david-dm.org/asset-pipe/asset-pipe-client#info=devDependencies" title="View the status of this project's development dependencies on DavidDM"><img src="https://img.shields.io/david/dev/asset-pipe/asset-pipe-client.svg" alt="Dev Dependency Status" /></a></span>

<!-- /BADGES -->


[![Greenkeeper badge](https://badges.greenkeeper.io/asset-pipe/asset-pipe-client.svg)](https://greenkeeper.io/)

A client for reading an asset file entry point and uploading it as an asset feed
to a [asset-pipe-build-server][asset-pipe-build-server] and for triggering
builds of executable asset bundles in the said server.

Creating asset bundles with [asset-pipe][asset-pipe] is a two step process. The
first step is to upload an asset feed to the
[asset-pipe-build-server][asset-pipe-build-server]. On upload the asset-feed
will be persisted and the [asset-pipe-build-server][asset-pipe-build-server]
will return the generated filename of the uploaded asset-feed.

The second step is then to create a bundle out of one or multiple asset-feeds.
This is done by providing the unique ID(s) of the asset-feeds one wants to use
to build an asset bundle to the
[asset-pipe-build-server][asset-pipe-build-server]. The build server will then
create an executable asset bundle out of these asset-feeds and persist this. It
will respond with the URL to the bundle.

This client helps with remotely triggering these steps in the
[asset-pipe-build-server][asset-pipe-build-server].

## Optimistic Bundling

The asset server can produce asset bundles in what we call an "optimistic"
fashion. This means that asset bundles will be automatically produced and
reproduced any time an asset changes or any time the definition of which assets
should be included in a bundle changes.

This works in the following way:

1. Any number of assets are uploaded to the asset server using the
   `client.publishAssets` method.
2. Bundling instructions are uploaded to the asset server using the
   `client.publishInstructions` method.

Steps 1 and 2 can be performed in any order and the asset server will
automatically bundle and rebundle as needed to produce up to date bundles for
any instructions that have been published to the server.

**Examples**

We might begin by first we publishing some bundling instructions. (Though we
could just as easily publish assets first):

```js
await client.publishInstructions('layout', 'js', ['podlet1', 'podlet2']);
```

At this point, the server will not have created any bundles as there are no
corresponding assets for `podlet1` or `podlet2`.

Next we upload the missing asset feeds for `podlet1` and `podlet2`.

```js
const { uri, id } = await client.publishAssets('podlet1', ['/path/to/file.js']);
const { uri, id } = await client.publishAssets('podlet2', ['/path/to/file.js']);
```

Once both these asset feeds are in place, the asset server will generate a fresh
bundle based on our earlier published instructions. Once finished, a new bundle
file will be available from the asset server.

### Calculating the location of produced bundle files

When `publishAssets` is successfully called, a unique asset hash `id` property
will be available on the returned object. sha256 hashing all asset hashes
together (in the same order they are defined in the publish instructions) and
appending the correct file extension to the result will give you the filename of
the resulting bundle.

**Example**

First publish assets and instructions

```js
await client.publishInstructions('layout', 'js', ['podlet1', 'podlet2']);
const result1 = await client.publishAssets('podlet1', ['/path/to/file.js']);
const result2 = await client.publishAssets('podlet2', ['/path/to/file.js']);
```

Next, compute a hash and resulting filename

```js
const hash = sha256Somehow(result1.id, result2.id);
const bundleFilename = `${hash}.js`;
```

Finally, the file can be retrieved from the asset server via the `/bundle`
endpoint.

```bash
GET http://<asset-server-url>/bundle/<hash>.js
```

To make some of this a little easier, 2 helper methods exist on the client:

-   `bundleURL` - calculates the url location for a bundle based on a given array of asset hashes.
-   `bundlingComplete` - determines if bundling is complete for a given array of asset hashes.

See API documentation below for more information.

## Installation

```bash
$ npm install @asset-pipe/client
```

## Example I

Read an [CommonJS module][commonjs] entry point and upload it as an asset-feed
to the [asset-pipe-build-server][asset-pipe-build-server]:

```js
const Client = require('@asset-pipe/client');

const client = new Client({
    serverId: 'my-app-1',
    buildServerUri: 'http://127.0.0.1:7100'
});

client
    .uploadFeed(['path/to/myFrontendCode.js'])
    .then(content => {
        // content contains filename of created the asset-feed
        console.log(content);
    })
    .catch(error => {
        console.log(error);
    });
```

## Example II

Read a CSS file entry point and upload it as an asset-feed to the
[asset-pipe-build-server][asset-pipe-build-server]:

```js
const Client = require('@asset-pipe/client');

const client = new Client({
    buildServerUri: 'http://127.0.0.1:7100'
});

client
    .uploadFeed(['/path/to/styles.css'])
    .then(content => {
        // content contains filename of created the asset-feed
        console.log(content);
    })
    .catch(error => {
        console.log(error);
    });
```

## Example III

Build a javascript bundle out of two asset feeds:

```js
const Client = require('@asset-pipe/client');
const client = new Client({
    serverId: 'my-app-2',
    buildServerUri: 'http://127.0.0.1:7100'
});

bundle
    .createRemoteBundle(
        [
            'f09a737b36b7ca19a224e0d78cc50222d636fd7af6f7913b01521590d0d7fe02.json',
            'c50ca03a63650502e1b72baf4e493d2eaa0e4aa38aa2951825e101b1d6ddb68b.json'
        ],
        'js'
    )
    .then(content => {
        // content contains URI to the created bundle
        console.log(content);
    })
    .catch(error => {
        console.log(error);
    });
```

## Example IIII

Build a CSS bundle out of two asset feeds:

```js
const Client = require('@asset-pipe/client');
const client = new Client({
    buildServerUri: 'http://127.0.0.1:7100'
});

bundle
    .createRemoteBundle(
        [
            'f09a737b36b7ca19a224e0d78cc50222d636fd7af6f7913b01521590d0d7fe02.json',
            'c50ca03a63650502e1b72baf4e493d2eaa0e4aa38aa2951825e101b1d6ddb68b.json'
        ],
        'css'
    )
    .then(content => {
        // content contains URI to the created bundle
        console.log(content);
    })
    .catch(error => {
        console.log(error);
    });
```

## API

Under the hood, when working with javascript, the [asset-pipe][asset-pipe]
project builds on [browserify][browserify]. Multiple methods in this module are
therefor underlaying Browserify methods where all features found in Browserify
can be used. Such methods will in this documentation point to the related
documentation in Browserify.

When working with CSS the underlying POST CSS is used but the implementation is
not exposed so there are no additional supported methods.

This module has the following API:

### constructor(options)

Supported arguments are:

-   `options.buildServerUri` - Required URI to the
    [asset-pipe-build-server][asset-pipe-build-server]
-   `options.serverId` - An optional unique name to identify the deployed server
    (required for runtime optimistic bundling)
-   `options.minify` - Use minification (optimistic bundling only) `true|false` Not providing this option will result in server default being used.
-   `options.sourceMaps` - (experimental) Use sourceMaps (optimistic bundling only) `true|false` Not providing this option will result in server default being used.
-   `options.logger` - An optional log4js compatible logger. See [abslog](https://www.npmjs.com/package/abslog) for more information
-   `options.development` - Puts the client in development mode. For use with the client.middleware() function (see below). Default `false`
-   `options.publish` - Puts the client in publish mode. For use with the client.middleware() function (see below). Default `false`
-   `options.js` - Optionally define the full path to a JavaScript file. For use with the client.middleware() function (see below)
-   `options.css` - Optionally define the full path to a CSS style file. For use with the client.middleware() function (see below)

### transform()

Same as the [Browserify transform][browserify-transform] method. _NOTE:_ Only
applicable when uploading javascript feeds.

### plugin()

Same as the [Browserify plugin][browserify-plugin] method. _NOTE:_ Only
applicable when uploading javascript feeds.

### uploadFeed(files)

Read the [CommonJS module][commonjs] or CSS file entry point and uploads it as
an asset feed to the [asset-pipe-build-server][asset-pipe-build-server].

-   `files` - Array - Either list of CommonJS module entry points - Same as
    `files` in the [Browserify constructor][browserify-opts] OR list of paths to
    CSS files

Returns a promise.

### createRemoteBundle(feeds, type)

Creates an asset bundle on the
[asset-pipe-build-server][asset-pipe-build-server].

-   `feeds` - Array - List of asset-feed filenames.
-   `type` - string - Either 'js' or 'css'

### sync()

Fetches centralised configuration information from the asset server.
This should be called after creating a new client instance and before any calls to `.bundleURL()` or `.bundlingComplete()`

**Example**

```js
const client = new Client(options);
await client.sync();
```

### publishAssets(tag, entrypoints, options)

Publishes assets to the asset server for use in optimisitic bundling. Bundles
will be created according to bundle instructions published using the
`publishInstructions` method.

-   `tag` - `string` - Alphanumeric string identifying the publisher. Should be
    unique.
-   `entrypoints` - `Array|string` - Array of asset entrypoint filenames or single asset entrypoint filename string to be published to the asset server.
-   `options` - `object` - Bundling options. `{minify: true|false, sourceMaps: true|false}` Setting these options here will override the same options provided to the constructor

`return` - `object` - An object with keys `id` (refering to the unique asset
hash) and `uri` (referring to the location of the published asset on the
server).

**Examples**

JavaScript

```js
const { uri, id } = await client.publishAssets('podlet1', '/path/to/file.js');
```

CSS

```js
const { uri, id } = await client.publishAssets('podlet1', '/path/to/file.css');
```

With minification

```js
const { uri, id } = await client.publishAssets('podlet1', '/path/to/file.js', {
    minify: true
});
```

### publishInstructions(tag, type, data, options)

Publishes bundling instructions to the asset server for use in optimisitic
bundling. Bundles are generated as specified by the `data` array. Anytime new
instructions are published (via `publishInstructions`) or assets are published
(via `publishAssets`), new bundles will be generated by the server.

-   `tag` - `string` - Alphanumeric string identifying the publisher. Should be
    unique.
-   `type` - `string` - Asset type. Valid values are 'js' and 'css'
-   `data` - `array` - Array of tags to bundle together. Each tag must refer to
    the tag property given when publishing assets using the `publishAssets`
    method.
-   `options` - `object` - Bundling options. `{minify: true|false, sourceMaps: true|false}` Setting these options here will override the same options provided to the constructor

`return` - 204 No Content is returned when publishing has successfully completed.

**Examples**

JavaScript

```js
await client.publishInstructions('layout', 'js', ['podlet1', 'podlet2']);
```

CSS

```js
await client.publishInstructions('layout', 'css', ['podlet1', 'podlet2']);
```

With minification

```js
await client.publishInstructions('layout', 'js', ['podlet1', 'podlet2'], {
    minify: true
});
```

### bundleURL(feedHashes, options)

Calculates a bundle url string based on a given array of hashes which are asset feed content hashes. Each time an asset feed is published using `client.publishAssets` the resolved object will contain an `id` property which is the hash of the feed content and can be used with this method.

Calculation is done by sha256 hashing together the given `hashes` and dropping the resulting hash into a url template.

As such, this method does not perform any requests to the server and therefore cannot guarantee that the bundle exists on the server.

**Note:** You should call `await client.sync();` one time after creating the client instance, before calling `bundleURL` to ensure the client has update information about the public location of bundle files.

-   `hashes` - `string[]` - array of asset feed content hashes as returned by `client.publishAssets`
-   `options` - `object`
    -   `options.prefix` - `string` url prefix to use when building bundle url. Defaults to `${client.buildServerUri}/bundle/` which is the location on the asset server that a bundle can be located. Overwrite this if you use a CDN and need to point to that.
    -   `options.type` - `string` (`js`|`css`) - file type. Defaults to `js`

`return` - `Promise<string>` - url for asset bundle on asset server.

**Example**

```js
// publish instructions
await client.publishInstructions('layout', 'js', ['podlet1', 'podlet2']);

// publish necessary assets
const { uri, id1 } = await client.publishAssets('podlet1', [
    '/path/to/file.js'
]);
const { uri, id2 } = await client.publishAssets('podlet2', [
    '/path/to/file.js'
]);

// calculate the url of the finished bundle
const url = await client.bundleURL([id1, id2]);
```

### bundlingComplete(feedhashes, options)

Calculates whether a bundling for the given `feedHashes` has been completed. The rules for this method are as follows:

**Note:** You should call `await client.sync();` one time after creating the client instance, before calling `bundleURL` to ensure the client has update information about the public location of bundle files.

-   If `feedHashes` is an empty array, this method resolves to `true` as no bundle needs to be built.
-   Otherwise, if `feedHashes` is not an empty array then a bundle url will be computed and a request made to check if the file exists on the server.

-   `hashes` - `string[]` - array of asset feed content hashes as returned by `client.publishAssets`
-   `options` - `object`
    -   `options.prefix` - `string` url prefix to use when building bundle url. Defaults to `${client.buildServerUri}/bundle/` which is the location on the asset server that a bundle can be located. Overwrite this if you use a CDN and need to point to that.
    -   `options.type` - `string` (`js`|`css`) - file type. Defaults to `js`

`return` - `Promise<boolean>` - resolves to a boolean representing whether the bundling process for the given `feedHashes` is considered to be complete.

**Example**

```js
// publish instructions
await client.publishInstructions('layout', 'js', ['podlet1', 'podlet2']);

// publish necessary assets
const { uri, id1 } = await client.publishAssets('podlet1', [
    '/path/to/file.js'
]);
const { uri, id2 } = await client.publishAssets('podlet2', [
    '/path/to/file.js'
]);

// calculate the url of the finished bundle
const isComplete = await client.bundlingComplete([id1, id2]);
```

### .middleware()

This method returns a connect middleware that can be used to both support assets in local development and to ensure assets are published before the request completes.

When `.middleware()` is called and the client flag `development` is set to `true` then assets
will be provided at `/js` and `/css` on your app. Additionally, file system watching will be enabled for JavaScript.

**N.B.** You must provide `js` and/or `css` options to the constructor for this to work.

_Example_

```js
const client = new Client({
    ...
    js: '/path/to/script.js',
    css: '/path/to/style.js',
    development: true,
    ...
})

app.use(client.middleware())

// curl http:<address>:<port>/js => bundled js scripts
// curl http:<address>:<port>/css => bundled css styles
```

When `.middleware()` is called and the client flag `publish` is set to `true` then given assets will be uploaded to the defined asset server at `buildServerUrl`. The `.js()` and `.css()` methods (explained below) can be used to retrieve the asset id hashes that will allow you to refer to these uploaded assets on the asset server.

**N.B.** You must provide `buildServerUri` as well as `js` and/or `css` options to the constructor for this to work.

_Example_

```js
const client = new Client({
    ...
    buildServerUri: 'http://asset-server.com:1234',
    js: '/path/to/script.js',
    css: '/path/to/style.js',
    publish: true,
    ...
})

app.use(client.middleware())
```

### .js()

Method for retrieving the id hash for JavaScript assets uploaded to an asset server

```js
const client = new Client({
    ...
    buildServerUri: 'http://asset-server.com:1234',
    js: '/path/to/script.js',
    css: '/path/to/style.js',
    publish: true,
    ...
})

client.js() // => null

app.use(client.middleware());

app.get('/', (req, res) => {
    client.js() // a2b2ab2a2b2b3bab4ab4aa22babab2ba2
})
```

### .css()

Method for retrieving the id hash for CSS assets uploaded to an asset server

```js
const client = new Client({
    ...
    buildServerUri: 'http://asset-server.com:1234',
    js: '/path/to/script.js',
    css: '/path/to/style.js',
    publish: true,
    ...
})

client.css() // => null

app.use(client.middleware());

app.get('/', (req, res) => {
    client.css() // b2b2ac2a2b4b3bab4ab2aa22babab2ba2
})
```

### .ready()

Method for waiting until assets have finished publishing to an asset server

```js
const client = new Client({
    ...
    buildServerUri: 'http://asset-server.com:1234',
    js: '/path/to/script.js',
    css: '/path/to/style.js',
    publish: true,
    ...
})

client.css() // => null

client.middleware();
await client.ready();

client.js() // a2b2ab2a2b2b3bab4ab4aa22babab2ba2
client.css() // b2b2ac2a2b4b3bab4ab2aa22babab2ba2
```

### .metrics

This module uses [@metrics/client](https://www.npmjs.com/package/@metrics/client) to expose metric objects for consumption via a stream.

Available metric names are:

-   publish_assets_timer
-   publish_instructions_timer
-   asset_server_sync_timer

**Example: piping metrics stream into a consumer**

```js
client.metrics.pipe(consumer);
```

See [@metrics/client](https://www.npmjs.com/package/@metrics/client) for more details including how to implement a consumer.

## Transpilers

Since [asset-pipe][asset-pipe] is built on [browserify][browserify] under the
hood, its fully possible to take advantage of the different transpiers available
for [browserify][browserify] when working with javascript.

As an example, here is how Babel is applied:

```js
const babelify = require('babelify');
const Client = require('@asset-pipe/client');

const client = new Client({ buildServerUri: 'http://127.0.0.1:7100' });

client.transform(babelify, { presets: ['es2015'] });

const { uri, id } = await client.publishAssets('podlet1', ['/path/to/file.js']);
```

## Contributing

The contribution process is as follows:

-   Fork this repository.
-   Make your changes as desired.
-   Run the tests using `npm test`. This will also check to ensure that 100% code
    coverage is maintained. If not you may need to add additional tests.
-   Stage your changes.
-   Run `git commit` or, if you are not familiar with [semantic commit
    messages](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit),
    please run `npm run cm` and follow the prompts instead which will help you
    write a correct semantic commit message.
-   Push your changes and submit a PR.

[commonjs]: https://nodejs.org/docs/latest/api/modules.html
[asset-pipe]: https://github.com/asset-pipe
[asset-pipe-build-server]: https://github.com/asset-pipe/asset-pipe-build-server
[browserify]: https://github.com/substack/node-browserify
[browserify-opts]: https://github.com/substack/node-browserify#browserifyfiles--opts
[browserify-plugin]: https://github.com/substack/node-browserify#bpluginplugin-opts
[browserify-transform]: https://github.com/substack/node-browserify#btransformtr-opts
