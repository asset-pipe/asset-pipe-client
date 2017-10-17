'use strict';

const url = require('url');
const JSONStream = require('JSONStream');
const request = require('request');
const JsWriter = require('asset-pipe-js-writer');
const CssWriter = require('asset-pipe-css-writer');
const assert = require('assert');
const { extname } = require('path');
const isStream = require('is-stream');

const extensions = Object.freeze({
    JS: '.js',
    CSS: '.css',
});

const endpoints = Object.freeze({
    UPLOAD: 'feed',
    BUNDLE: 'bundle',
});

function post(options) {
    const opts = {
        url: options.url,
        timeout: 5000,
        headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        },
    };

    if (!isStream(options.body)) {
        opts.body = options.body;
    }

    return new Promise((resolve, reject) => {
        const req = request.post(opts, (error, response, body) => {
            if (error) return reject(error);
            try {
                body = JSON.parse(body);
            } catch (err) {}
            resolve({ response, body });
        });

        if (isStream(options.body)) {
            options.body.pipe(req);
        }
    });
}

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

    uploadJsFeed(files, options) {
        const writer = new JsWriter(files, options, false, true);

        this.transforms.forEach(entry => {
            writer.transform(entry.transform, entry.options);
        });

        this.plugins.forEach(entry => {
            writer.plugin(entry.plugin, entry.options);
        });

        return post({
            url: url.resolve(this.options.buildServerUri, endpoints.UPLOAD),
            body: writer.bundle().pipe(JSONStream.stringify()),
        });
    }

    uploadCssFeed(files) {
        const writer = new CssWriter(files);
        return post({
            url: url.resolve(this.options.buildServerUri, endpoints.UPLOAD),
            body: writer.pipe(JSONStream.stringify()),
        });
    }

    /**
     * Upload asset feed to asset server
     */

    uploadFeed(files, options = {}) {
        assert(
            Array.isArray(files),
            `Expected 'files' to be an array, instead got ${files}`
        );
        assert(
            files.length,
            `Expected 'files' array to contain at least 1 item`
        );
        assert(
            files.every(file => typeof file == 'string'),
            `Expected each item in array 'files' to be a string, got ${files}`
        );
        assert(
            files.every(file => file.includes('.js')) ||
                files.every(file => file.includes('.css')),
            `Expected ALL items in array 'files' to end with .js 
                or ALL items in array 'files' to end with .css, got ${files}`
        );

        let upload;

        switch (extname(files[0])) {
            case extensions.CSS:
                upload = this.uploadCssFeed(files);
                break;
            case extensions.JS:
                upload = this.uploadJsFeed(files, options);
                break;
        }

        return upload
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
        return post({
            url: url.resolve(this.options.buildServerUri, endpoints.BUNDLE),
            body: JSON.stringify(sources),
        })
            .then(({ response, body }) => {
                if ([200, 202].includes(response.statusCode)) {
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
};
