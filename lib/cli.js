#!/usr/bin/env node


var program     = require('commander'),
    writer      = require('./writer.js'),
    pckage      = require('../package.json');



program
    .version(pckage.version);

/*
    /home/diablo/Work/git/lego/server-micro-a/assets/js/main.js
    node lib/cli.js write -s "/home/diablo/Work/git/lego/server-micro-a/assets/js/main.js" -d "./foo.json"
*/


program
    .command('write')
    .description('write an asset feed')
    .option("-s, --source <source>", "source file to read")
    .option("-d, --destination <destination>", "destination to write too")
    .action(writer.js)
    .on('--help', writer.help);



program.on('--help', () => {
    console.log('  Helpe here:');
});



if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
}



program.parse(process.argv);
