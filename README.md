# asset-pipe-client

```js

const AssetClient = require('asset-pipe-client');

const client = new AssetClient({
    files: ['path/to/js']
    buildServerUri: 'http://127.0.0.1:7100',
});

client.uploadFeed()
    .then(content => console.log(content))
    .catch(console.error);

client.createRemoteBundle()
    .then(uri => console.log(uri))
    .catch(console.error);

```
