'use strict';

const url = require('url');
const fs = require('fs');

const JSONStream = require('JSONStream');
const request = require('request');
const Writer = require('asset-pipe-js-writer');

class Client {
    constructor ({
        files = [],
        buildServerUri = 'http://127.0.0.1:7100',
    } = {}) {
        this.files = files;
        this.buildServerUri = buildServerUri;

        this.transforms = [];
        this.plugins = [];
    }

    transform (transform, options) {
        this.transforms.push({
            transform,
            options,
        });
    }

    plugin (plugin, options) {
        this.plugins.push({
            plugin,
            options,
        });
    }


   /**
     * Upload asset feed to asset server
     */

    uploadFeed () {
        return new Promise((resolve, reject) => {
            const writer = new Writer(this.files, this.options, false, true);

            this.transforms.forEach((entry) => {
                writer.transform(entry.transform, entry.options);
            });

            this.plugins.forEach((entry) => {
                writer.plugin(entry.plugin, entry.options);
            });

            writer
                .bundle()
                .pipe(JSONStream.stringify())
                .pipe(request.post({
                    url: url.resolve(this.buildServerUri, 'feed'),
                    json: true,
                }, (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(body);
                }));
        });
    }


   /**
     * Make a bundle out of asset feeds on the asset server
     */

    createRemoteBundle (sources) {
        return new Promise((resolve, reject) => {
            request.post({
                url: url.resolve(this.buildServerUri, 'bundle'),
                body: sources,
                json: true,
            }, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                resolve(body);
            });
        });
    }


    createLocalBundle (file = './bundle.js') {
        const writer = new Writer(this.files, this.options, true);
        const fileStream = fs.createWriteStream(file);

        this.transforms.forEach((entry) => {
            writer.transform(entry.transform, entry.options);
        });

        this.plugins.forEach((entry) => {
            writer.plugin(entry.plugin, entry.options);
        });

        writer.transform({
            global: true
        }, 'uglifyify')

        writer.bundle().pipe(fileStream);
    }
}

module.exports = Client;
