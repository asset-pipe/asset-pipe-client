'use strict';

const Client = require('../');

const bundle = new Client({
    files: './assets/es5/module.a.js',  // wasted!!!!!!
    buildServerUri: 'http://127.0.0.1:7100',
});


bundle.createRemoteBundle([
    'f09a737b36b7ca19a224e0d78cc50222d636fd7af6f7913b01521590d0d7fe02.json',
    'c50ca03a63650502e1b72baf4e493d2eaa0e4aa38aa2951825e101b1d6ddb68b.json'
])
    .then(content => console.log(content))
    .catch(console.error);
