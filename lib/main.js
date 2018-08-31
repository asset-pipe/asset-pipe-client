'use strict';

const url = require('url');
const JSONStream = require('JSONStream');
const request = require('request');
const JsWriter = require('@asset-pipe/js-writer');
const CssWriter = require('@asset-pipe/css-writer');
const assert = require('assert');
const { extname } = require('path');
const isStream = require('is-stream');
const Joi = require('joi');
const Boom = require('boom');
const { hashArray } = require('@asset-pipe/common');
const schemas = require('./schemas');
const { buildURL } = require('../lib/utils');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const AssetDevMiddleware = require('@asset-pipe/dev-middleware');

function getStream(stream) {
    const data = [];
    return new Promise((resolve, reject) => {
        stream.once('error', reject);
        stream.on('data', chunk => data.push(chunk));
        stream.on('end', () => resolve(data));
    });
}

const extensions = Object.freeze({
    JS: '.js',
    CSS: '.css',
});

const endpoints = Object.freeze({
    UPLOAD: 'feed',
    BUNDLE: 'bundle',
    PUBLISH_ASSETS: 'publish-assets',
    PUBLISH_INSTRUCTIONS: 'publish-instructions',
});

const assetTypes = ['js', 'css'];

function post(options) {
    const opts = {
        url: options.url,
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

function get(uri) {
    return new Promise((resolve, reject) => {
        request(uri, (error, response, body) => {
            if (error) return reject(error);
            resolve({ response, body });
        });
    });
}

module.exports = class AssetPipeClient {
    constructor({
        serverId,
        server,
        buildServerUri,
        minify,
        sourceMaps,
        logger,
        tag,
        development,
    } = {}) {
        this.buildServerUri = server || buildServerUri;
        assert(
            this.buildServerUri,
            `Expected "server" to be a uri, got ${this.buildServerUri}`
        );
        this.publicFeedUrl = null;
        this.publicBundleUrl = null;
        this.serverId = serverId;

        this.transforms = [];
        this.plugins = [];
        this.minify = minify;
        this.sourceMaps = sourceMaps;
        this.metrics = new Metrics();
        this.log = abslog(logger);
        this.tag = tag;
        this.development = Boolean(development);
        this.assets = { js: null, css: null };
        this.hashes = { js: null, css: null };
        this.publishPromises = [];
        this.bundlePromises = [];
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
        const writer = new JsWriter(files, options);

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
            body: writer.bundle().pipe(JSONStream.stringify()),
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
            `Asset build server responded with unknown error. Http status ${
                response.statusCode
            }`
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

        const { statusCode } = response;

        if ([200, 202].includes(statusCode)) {
            return Promise.resolve(body);
        }

        const { message } = body;

        if (statusCode === 400) {
            throw new Error(message);
        }

        throw new Error(
            `Asset build server responded with unknown error. Http status ${statusCode}. Original message: "${message}".`
        );
    }

    writer(type, files, options) {
        Joi.assert(
            type,
            schemas.type,
            `Invalid 'type' argument given when attempting to determine writer.`
        );

        if (type === 'css') {
            return new CssWriter(files);
        } else {
            const writer = new JsWriter(files, options);

            this.transforms.forEach(entry => {
                writer.transform(entry.transform, entry.options);
            });

            this.plugins.forEach(entry => {
                writer.plugin(entry.plugin, entry.options);
            });

            return writer;
        }
    }

    determineType(values) {
        return extname((values && values[0]) || '').replace('.', '');
    }

    async publishAssets(tag, entrypoints, options = {}) {
        Joi.assert(
            tag,
            schemas.tag,
            `Invalid 'tag' argument given when attempting to publish assets.`
        );

        if (entrypoints && !Array.isArray(entrypoints)) {
            entrypoints = [entrypoints];
        }

        Joi.assert(
            entrypoints,
            schemas.files,
            `Invalid 'entrypoints' argument given when attempting to publish assets.`
        );
        Joi.assert(
            options,
            schemas.options,
            `Invalid 'options' argument given when attempting to publish assets.`
        );

        const opts = {
            minify: this.minify,
            sourceMaps: this.sourceMaps,
            ...options,
        };

        const metricEnd = this.metrics.timer({
            name: 'publish_assets_timer',
            description: 'Time spent publishing assets',
            meta: { assetType: null, statusCode: null },
        });

        const type = this.determineType(entrypoints);

        try {
            const writer = this.writer(type, entrypoints, options);

            const data = await getStream(writer.bundle());

            this.log.trace(
                `${type} asset feed produced for tag "${tag}", entrypoints "${JSON.stringify(
                    entrypoints
                )}" and options "${JSON.stringify(options)}"`
            );

            const {
                response: { statusCode },
                body,
            } = await post({
                url: buildURL(
                    url.resolve(
                        this.buildServerUri,
                        `${endpoints.PUBLISH_ASSETS}`
                    ),
                    { minify: opts.minify, sourceMaps: opts.sourceMaps }
                ),
                body: JSON.stringify({
                    tag,
                    type,
                    data,
                }),
                serverId: this.serverId,
            });

            const { message } = body;

            if (statusCode === 200) {
                metricEnd({ meta: { assetType: type, statusCode } });
                this.log.debug(
                    `${type} asset feed successfully published to asset server "${
                        this.buildServerUri
                    }" as files "${body.id}.json" and "${body.id}.${type}"`
                );
                return body;
            }

            if (statusCode === 400) {
                throw Boom.badRequest(message);
            }

            throw new Boom(
                `Asset build server responded with an error. Original message: ${message}.`,
                {
                    statusCode,
                }
            );
        } catch (err) {
            metricEnd({
                meta: { assetType: type, statusCode: err.statusCode || 500 },
            });

            throw err;
        }
    }

    async publishInstructions(tag, type, data, options = {}) {
        Joi.assert(
            tag,
            schemas.tag,
            `Invalid 'tag' argument given when attempting to publish instructions.`
        );
        Joi.assert(
            type,
            schemas.type,
            `Invalid 'type' argument given when attempting to publish instructions.`
        );
        Joi.assert(
            data,
            schemas.bundleInstruction,
            `Invalid 'data' argument given when attempting to publish instructions.`
        );

        const opts = {
            minify: this.minify,
            sourceMaps: this.sourceMaps,
            ...options,
        };

        const metricEnd = this.metrics.timer({
            name: 'publish_instructions_timer',
            description: 'Time spent publishing instructions',
            meta: { assetType: null, statusCode: null },
        });

        try {
            const {
                response: { statusCode },
                body,
            } = await post({
                url: buildURL(
                    url.resolve(
                        this.buildServerUri,
                        `${endpoints.PUBLISH_INSTRUCTIONS}`
                    ),
                    { minify: opts.minify, sourceMaps: opts.sourceMaps }
                ),
                body: JSON.stringify({ tag, type, data }),
                serverId: this.serverId,
            });

            const { message } = body;

            if ([200, 204].includes(statusCode)) {
                metricEnd({ meta: { assetType: type, statusCode } });
                this.log.debug(
                    `${type} asset bundling instructions successfully published to asset server "${
                        this.buildServerUri
                    }" using tag "${tag}", data "${JSON.stringify(
                        data
                    )}" and options "${JSON.stringify(options)}"`
                );
                return Promise.resolve(body);
            }

            if (statusCode === 400) {
                throw Boom.badRequest(message);
            }

            throw new Boom(
                `Asset build server responded with an error. Original message: ${message}.`,
                {
                    statusCode,
                }
            );
        } catch (err) {
            metricEnd({
                meta: { assetType: type, statusCode: err.statusCode || 500 },
            });

            throw err;
        }
    }

    async sync() {
        if (!this.publicFeedUrl || !this.publicBundleUrl) {
            const metricEnd = this.metrics.timer({
                name: 'asset_server_sync_timer',
                description: 'Time spent syncing with asset server',
                meta: { statusCode: null },
            });

            const { body } = await get(
                url.resolve(this.buildServerUri, '/sync/')
            );
            try {
                const parsedBody = JSON.parse(body);
                this.publicFeedUrl = parsedBody.publicFeedUrl;
                this.publicBundleUrl = parsedBody.publicBundleUrl;

                metricEnd({ meta: { statusCode: 200 } });
                this.log.debug(
                    `asset server sync successfully performed against asset server "${
                        this.buildServerUri
                    }", publicFeedUrl set to "${
                        this.publicFeedUrl
                    }" and publicBundleUrl set to "${this.publicBundleUrl}"`
                );
            } catch (err) {
                metricEnd({ meta: { statusCode: err.statusCode || 500 } });

                throw Boom.boomify(err, {
                    message:
                        'Unable to perform client/server sync as server returned an unparsable response',
                });
            }
        }
    }

    bundleHash(feedHashes) {
        return hashArray(feedHashes);
    }

    bundleFilename(hash, type) {
        return `${hash}.${type}`;
    }

    bundleURL(feedHashes, options = {}) {
        assert(
            Array.isArray(feedHashes),
            `Expected argument 'feedHashes' to be an array when calling 'bundleURL(feedHashes)'. Instead 'feedHashes' was ${typeof feedHashes}`
        );
        assert(
            feedHashes.every(source => typeof source === 'string'),
            `Expected all entries in array 'feedHashes' to be strings when calling 'bundleURL(feedHashes)'. Instead 'feedHashes' was ${feedHashes}`
        );

        if (feedHashes.length === 0) return null;

        const { type, prefix } = {
            prefix:
                this.publicBundleUrl ||
                url.resolve(this.buildServerUri, '/bundle/'),
            type: 'js',
            ...options,
        };
        const hash = this.bundleHash(feedHashes);
        const filename = this.bundleFilename(hash, type);
        return url.resolve(prefix, filename);
    }

    async bundlingComplete(feedHashes, options = {}) {
        assert(
            Array.isArray(feedHashes),
            `Expected argument 'feedHashes' to be an array when calling 'bundlingComplete(feedHashes)'. Instead 'feedHashes' was ${typeof feedHashes}`
        );
        assert(
            feedHashes.every(source => typeof source === 'string'),
            `Expected all entries in array 'feedHashes' to be strings when calling 'bundlingComplete(feedHashes)'. Instead 'feedHashes' was ${feedHashes}`
        );

        const uri = this.bundleURL(feedHashes, options);
        if (!uri) return true;
        const { response } = await get(uri);
        return response.statusCode >= 200 && response.statusCode < 300;
    }

    middleware() {
        if (this.development) {
            const devMiddleware = new AssetDevMiddleware(
                [this.assets.js].filter(Boolean),
                [this.assets.css].filter(Boolean)
            );

            this.transforms.forEach(entry => {
                devMiddleware.transform(entry.transform, entry.options);
            });

            this.plugins.forEach(entry => {
                devMiddleware.plugin(entry.plugin, entry.options);
            });

            // middleware to serve up development assets at /js and /css
            return devMiddleware.router();
        } else {
            // middleware to ensure that assets are uploaded
            return (req, res, next) => {
                this.ready()
                    .then(() => next())
                    .catch(next);
            };
        }
    }

    js() {
        return this.hashes.js;
    }

    css() {
        return this.hashes.css;
    }

    publish({ js = null, css = null } = {}) {
        this.publishPromises = [];
        this.assets = { js, css };
        if (this.development) return;

        if (js) {
            const promise = this.publishAssets(this.tag, js).then(
                ({ id }) => (this.hashes.js = id)
            );

            this.publishPromises.push(promise);
        }

        if (css) {
            const promise = this.publishAssets(this.tag, css).then(
                ({ id }) => (this.hashes.css = id)
            );

            this.publishPromises.push(promise);
        }

        return this.publishPromises;
    }

    bundle({ js = [], css = [] } = {}) {
        this.bundlePromises = [];
        this.instructions = { js, css };
        if (this.development) return;

        if (js) {
            const promise = this.publishInstructions(this.tag, 'js', js);
            this.bundlePromises.push(promise);
        }

        if (css) {
            const promise = this.publishInstructions(this.tag, 'css', css);
            this.bundlePromises.push(promise);
        }

        return this.bundlePromises;
    }

    async assetUrlByType(hashes, type) {
        const inst = this.instructions[type];
        if (!Array.isArray(inst) || !inst.length) return [];
        if (!Array.isArray(hashes) || !hashes.length) return [];

        if (this[type].length === hashes.length) {
            if (this.bundleURLs[type] === this.bundleURL(hashes)) {
                return [this.bundle[type]];
            }

            if (!this.verifyingBundle) {
                this.verifyingBundle = true;
                this.bundleURLs[type] = null;
                this.bundlingComplete(hashes)
                    .then(bundleURL => {
                        this.bundleURLs[type] = bundleURL;
                        this.verifyingBundle = false;
                    })
                    .catch(err => {
                        this.log.error(err);
                        this.verifyingBundle = false;
                    });
            }
        }

        // return fallback
        return hashes.map(hash => `${this.publicBundleUrl}${hash}.${type}`);
    }

    scripts(hashes = []) {
        return this.assetUrlByType(hashes, 'js');
    }

    styles(hashes = []) {
        return this.assetUrlByType(hashes, 'css');
    }

    ready() {
        if (this.development) return Promise.resolve(true);
        return Promise.all([...this.publishPromises, ...this.bundlePromises]);
    }
};
