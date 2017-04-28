'use strict';

const Client = require('../');

const moduleA = new Client({
    buildServerUri: 'http://127.0.0.1:7100',
});


const moduleB = new Client({
    buildServerUri: 'http://127.0.0.1:7100',
});


moduleA.uploadFeed(['./assets/es5/module.a.js'])
    .then(content => console.log(content))
    .catch(console.error);


moduleB.uploadFeed(['./assets/es5/module.b.js'])
    .then(content => console.log(content))
    .catch(console.error);
