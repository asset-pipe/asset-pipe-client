"use strict";

const JSONStream = require('JSONStream');
const request = require('request');
const Writer = require('asset-pipe-js-writer');


class Client {
    constructor (files = [], options = {}) {
        this.files = files;
        this.options = options;

        this.transforms = [];
        this.plugins = [];

        this.buildServerUri = 'http://127.0.0.1:7100';

        this.remoteFeed = '';
        this.remoteBundle = '';
    }

    transform (transform, options) {
        this.transforms.push({
            transform: transform,
            options: options
        });
    }


    plugin (plugin, options) {
        this.plugins.push({
            plugin: plugin,
            options: options
        });
    }


   /** 
     * Upload asset feed to asset server
     */

    uploadFeed (onError, onSuccess) {

        const writer = new Writer(this.files, this.options);

        this.transforms.forEach((entry) => {
            writer.transform(entry.transform, entry.options);
        });

        this.plugins.forEach((entry) => {
            writer.plugin(entry.plugin, entry.options);
        });

        writer.bundle().pipe(JSONStream.stringify()).pipe(request.post({
            url: this.buildServerUri + '/feed',
            json: true
        }, (error, response, body) => {
            if (error) {
                return onError(error);
            }
            this.remoteFeed = body.uri;
            onSuccess(body);
        }));
    }


   /** 
     * Make a bundle out of asset feeds on the asset server
     */

    remoteBundle (onError, onSuccess, sources) {
        request.post({
            url: this.buildServerUri + '/bundle',
            body: sources,
            json: true
        }, (error, response, body) => {
            if (error) {
                return onError(error);
            }
            this.remoteBundle = body.uri;
            onSuccess(body);
        });
    }
}

module.exports = Client;
