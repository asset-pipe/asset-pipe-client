"use strict";

const stream = require('stream');
// const concat = require('concat-stream');
const Mid = require('../lib/writer.js');
const tap = require('tap');




const sourceStream = (arr) => {
    return new stream.Readable({
        objectMode : false,
        read: function (n) {
            arr.forEach((chunk) => {
                this.push(chunk);
            });
            this.push(null);
        }
    });
}

const a = ['a','b','c'];
const b = ['d', 'a','b','c'];


tap.test('not a real test', (t) => {
    t.end();
});
