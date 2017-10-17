'use strict';

const { join } = require('path');
const Client = require('../');

async function main() {
    const moduleA = new Client({
        buildServerUri: 'http://127.0.0.1:7100',
    });

    const moduleB = new Client({
        buildServerUri: 'http://127.0.0.1:7100',
    });

    const results = await Promise.all([
        moduleA.uploadFeed([join(__dirname, './assets/es5/module.a.js')]),
        moduleA.uploadFeed([join(__dirname, './assets/es5/module.a.css')]),
        moduleB.uploadFeed([join(__dirname, './assets/es5/module.b.js')]),
        moduleB.uploadFeed([join(__dirname, './assets/es5/module.b.css')]),
    ]);

    results.map(console.log);
}

main()
    .then(content => console.log(content))
    .catch(console.error);
