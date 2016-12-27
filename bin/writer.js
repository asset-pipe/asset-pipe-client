"use strict";

const   jsWriter      = require('asset-pipe-js-writer'),
        JSONStream    = require('JSONStream'),
        fs            = require('fs');


module.exports.js = (options) => {

    if (options.source && options.destination) {
        let writeStream = fs.createWriteStream(options.destination);
        jsWriter(options.source, true).pipe(JSONStream.stringify()).pipe(writeStream);
        return;    
    }
    

    this.help();
};



module.exports.help = () => {
    console.log('  Examples here:');
};
