'use strict';

const url = require('url');
const JSONStream = require('JSONStream');
const request = require('request');
const JsWriter = require('@asset-pipe/js-writer');
const CssWriter = require('@asset-pipe/css-writer');
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

const assetTypes = ['js', 'css'];

function post(options) {
    const opts = {
        url: options.url,
        timeout: 5000,
        headers: {
            'content-type': 'application/json',
            accept: 'application/json',
        },
    };

    if (options.serverId) {
        opts.headers['origin-server-id'] = options.serverId;
    }

    if (!isStream(options.body)) {
        opts.body = options.body;
    }

    return new Promise((resolve, reject) => {
        const req = request.post(opts, (error, response, body) => {
            if (error) return reject(error);
            try {
                body = JSON.parse(body);
            } catch (err) {} // eslint-disable-line no-empty
            resolve({ response, body });
        });

        if (isStream(options.body)) {
            options.body.pipe(req);
        }
    });
}

module.exports = class Client {
    constructor({ serverId, buildServerUri } = {}) {
        assert(
            buildServerUri,
            `Expected "buildServerUri" to be a uri, got ${buildServerUri}`
        );
        this.buildServerUri = buildServerUri;
        this.serverId = serverId;

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
            url: url.resolve(this.buildServerUri, `${endpoints.UPLOAD}/js`),
            body: writer.bundle().pipe(JSONStream.stringify()),
            serverId: this.serverId,
        });
    }

    uploadCssFeed(files) {
        const writer = new CssWriter(files);
        return post({
            url: url.resolve(this.buildServerUri, `${endpoints.UPLOAD}/css`),
            body: writer.pipe(JSONStream.stringify()),
            serverId: this.serverId,
        });
    }

    /**
     * Upload asset feed to asset server
     */

    async uploadFeed(files, options = {}) {
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
            `Expected ALL items in array 'files' to end with .js or ALL items in array 'files' to end with .css, got ${files.join(
                ', '
            )}`
        );

        let upload;

        switch (extname(files[0])) {
            case extensions.CSS:
                upload = await this.uploadCssFeed(files);
                break;
            case extensions.JS:
                upload = await this.uploadJsFeed(files, options);
                break;
        }

        const { response, body } = upload;
        if (response.statusCode === 200) {
            return Promise.resolve(body);
        }
        if (response.statusCode === 400) {
            throw new Error(body.message);
        }
        throw new Error(
            `Asset build server responded with unknown error. Http status ${response.statusCode}`
        );
    }

    /**
     * Make a bundle out of asset feeds on the asset server
     */

    async createRemoteBundle(sources, type) {
        assert(
            Array.isArray(sources),
            `Expected argument 'sources' to be an array. Instead got ${typeof sources}`
        );
        assert(
            sources.every(source => typeof source === 'string'),
            `Expected all entries in array 'sources' to be strings. Instead got ${sources}`
        );
        assert(
            sources.every(source => source.includes('.json')),
            `Expected ALL items in array 'sources' to end with .json. Instead got ${sources}`
        );
        assert(
            assetTypes.includes(type),
            `Expected argument 'type' to be one of ${assetTypes.join(
                '|'
            )}. Instead got '${type}'`
        );
        const { response, body } = await post({
            url: url.resolve(
                this.buildServerUri,
                `${endpoints.BUNDLE}/${type}`
            ),
            body: JSON.stringify(sources),
            serverId: this.serverId,
        });

        if ([200, 202].includes(response.statusCode)) {
            return Promise.resolve(body);
        }
        if (response.statusCode === 400) {
            throw new Error(body.message);
        }
        throw new Error(
            `Asset build server responded with unknown error. Http status ${response.statusCode}`
        );
    }
};
