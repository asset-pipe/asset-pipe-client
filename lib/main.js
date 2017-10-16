'use strict';

const url = require('url');
const JSONStream = require('JSONStream');
const request = require('request');
const JsWriter = require('asset-pipe-js-writer');
const assert = require('assert');

module.exports = class Client {
    constructor(options = {}) {
        this.options = Object.assign(
            {
                buildServerUri: 'http://127.0.0.1:7100',
            },
            options
        );

        this.transforms = [];
        this.plugins = [];
    }

    transform(transform, options) {
        this.transforms.push({
            transform,
            options,
        });
    }

    plugin(plugin, options) {
        this.plugins.push({
            plugin,
            options,
        });
    }

    uploadJsFeed(files, options = {}) {
        return new Promise((resolve, reject) => {
            const writer = new JsWriter(files, options, false, true);

            this.transforms.forEach(entry => {
                writer.transform(entry.transform, entry.options);
            });

            this.plugins.forEach(entry => {
                writer.plugin(entry.plugin, entry.options);
            });

            writer
                .bundle()
                .pipe(JSONStream.stringify())
                .pipe(
                    request.post(
                        {
                            url: url.resolve(
                                this.options.buildServerUri,
                                'feed'
                            ),
                            json: true,
                        },
                        (error, response, body) => {
                            if (error) return reject(error);
                            resolve({ response, body });
                        }
                    )
                );
        });
    }

    /**
     * Upload asset feed to asset server
     */

    uploadFeed(files, options = {}) {
        assert(files, `Expected 'files' to be an array, instead got ${files}`);
        assert(
            files.every(file => typeof file == 'string'),
            `Expected each item in array 'files' to be a string, got ${files}`
        );

        return this.uploadJsFeed(files, options)
            .then(({ response, body }) => {
                if (response.statusCode === 200) {
                    return Promise.resolve(body);
                }
                if (response.statusCode === 400) {
                    return Promise.reject(new Error(body.message));
                }
                return Promise.reject(
                    new Error(
                        `Asset build server responded with unknown error. Http status ${response.statusCode}`
                    )
                );
            })
            .catch(error => Promise.reject(error));
    }

    /**
     * Make a bundle out of asset feeds on the asset server
     */

    createRemoteBundle(sources) {
        return new Promise((resolve, reject) => {
            request.post(
                {
                    url: url.resolve(this.options.buildServerUri, 'bundle'),
                    body: sources,
                    json: true,
                },
                (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    if (response.statusCode === 200) {
                        return resolve(body);
                    }
                    if (response.statusCode === 202) {
                        return resolve(body);
                    }
                    if (response.statusCode === 400) {
                        return reject(new Error(body.message));
                    }
                    reject(
                        new Error(
                            `Asset build server responded with unknown error. Http status ${response.statusCode}`
                        )
                    );
                }
            );
        });
    }
};
