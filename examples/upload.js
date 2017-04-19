'use strict';

const Client = require('../');

const moduleA = new Client({
    files: './assets/es5/module.a.js',
    buildServerUri: 'http://127.0.0.1:3031',
});


const moduleB = new Client({
    files: './assets/es5/module.b.js',
    buildServerUri: 'http://127.0.0.1:3031',
});


moduleA.uploadFeed()
    .then(content => console.log(content))
    .catch(console.error);


moduleB.uploadFeed()
    .then(content => console.log(content))
    .catch(console.error);
