'use strict';

const jsWriter = require('@asset-pipe/js-writer');
const JSONStream = require('JSONStream');
const fs = require('fs');

module.exports.js = options => {
    if (options.source && options.destination) {
        const writeStream = fs.createWriteStream(options.destination);
        jsWriter(options.source, true)
            .pipe(JSONStream.stringify())
            .pipe(writeStream);
        return;
    }

    this.help();
};

module.exports.help = () => {
    console.log('  Examples here:');
};
