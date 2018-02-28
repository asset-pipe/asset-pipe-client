#!/usr/bin/env node
'use strict';

const program = require('commander');
const writer = require('./writer.js');
const pckage = require('../package.json');

program.version(pckage.version);

/*
    /home/diablo/Work/git/lego/server-micro-a/assets/js/main.js
    node lib/cli.js write -s "/home/diablo/Work/git/lego/server-micro-a/assets/js/main.js" -d "./foo.json"
*/

program
    .command('write')
    .description('write an asset feed')
    .option('-s, --source <source>', 'source file to read')
    .option('-d, --destination <destination>', 'destination to write too')
    .action(writer.js)
    .on('--help', writer.help);

program.on('--help', () => {
    console.log('  Help here:');
});

if (!process.argv.slice(2).length) {
    program.outputHelp();
    return;
}

program.parse(process.argv);
