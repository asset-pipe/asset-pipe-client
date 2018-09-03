'use strict';

const express = require('express');
const { resolve } = require('path');
const AssetPipeServer = require('@asset-pipe/server');
const Client = require('../../');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createAssetServer() {
    const app = express();
    const server = new AssetPipeServer(null, {
        bundleInProcess: true,
    });
    app.use(server.router());
    return app;
}

function startServer(app) {
    return new Promise(resolve => {
        const server = app.listen(() => {
            resolve({
                server,
                port: server.address().port,
            });
        });
    });
}

function closeServer(server) {
    return new Promise(resolve => {
        server.close(resolve);
    });
}

test(
    '.scripts()',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        await client.sync();

        const published = await client.publish({
            js: resolve(__dirname, '../assets/script.js'),
        });

        await client.bundle({ js: ['test'], css: null });

        const fallbackScripts = client.scripts([published.js]);

        expect(client.verifyingBundle).toBe(true);
        await sleep(500);
        client.scripts([published.js]);
        expect(client.verifyingBundle).toBe(false);

        await closeServer(server);

        expect(client.hashes.js).toEqual(
            'ba74ef6a7e756dd1f55a205da347c20df59a0aef7b9a28b7512fd1ce64fe7ba9'
        );

        expect(fallbackScripts[0]).toMatch(
            '/bundle/ba74ef6a7e756dd1f55a205da347c20df59a0aef7b9a28b7512fd1ce64fe7ba9.js'
        );

        expect(client.scripts([published.js])[0]).toMatch(
            '/bundle/8c11af93300a6bde836b5ce1f306422602bbb53873598435e38026e1f0422649.js'
        );
    },
    30000
);

test(
    '.styles() method',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        await client.sync();

        const published = await client.publish({
            css: resolve(__dirname, '../assets/style.css'),
        });

        await client.bundle({ js: null, css: ['test'] });

        const fallbackStyles = client.styles([published.css]);

        expect(client.verifyingBundle).toBe(true);
        await sleep(500);
        client.styles([published.css]);
        expect(client.verifyingBundle).toBe(false);

        await closeServer(server);

        expect(client.hashes.css).toEqual(
            'b67d80ae7bbaa31f4c997c9383902e5b94945d755d94cf263fc9c1c401e531a5'
        );

        expect(fallbackStyles[0]).toMatch(
            '/bundle/b67d80ae7bbaa31f4c997c9383902e5b94945d755d94cf263fc9c1c401e531a5.css'
        );

        expect(client.styles([published.css])[0]).toMatch(
            '/bundle/c429df35a6bb8fe62b28df01f13b7d852f489fc22cf2de7b63cf8867c3ddaaef.css'
        );
    },
    30000
);

test(
    '.assetUrlByType() method correctly handles .bundlingComplete() method failure',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundlingComplete = jest.fn(() => Promise.reject());

        await client.sync();

        const published = await client.publish({
            js: resolve(__dirname, '../assets/script.js'),
        });

        await client.bundle({ js: ['test'] });

        const fallbackScripts = client.scripts([published.js]);

        await sleep(500);
        await server.close();

        expect(fallbackScripts[0]).toMatch(published.js);
        expect(client.bundlingComplete).toHaveBeenCalled();
    },
    30000
);

test(
    '.assetUrlByType() method falls back when verification underway',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundlingComplete = jest.fn(() => Promise.resolve());

        await client.sync();

        const published = await client.publish({
            js: resolve(__dirname, '../assets/script.js'),
        });

        await client.bundle({ js: ['test'] });

        client.verifyingBundle = true;

        const fallbackScripts = client.scripts([published.js]);

        await sleep(500);
        await server.close();

        expect(fallbackScripts[0]).toMatch(published.js);
        expect(client.bundlingComplete).not.toHaveBeenCalled();
    },
    30000
);

test(
    ".assetUrlByType() method falls back when given hash count doesn't match tag count",
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundleURL = jest.fn();

        await client.sync();

        const published = await client.publish({
            js: resolve(__dirname, '../assets/script.js'),
        });

        await client.bundle({ js: ['test', 'test2'] });

        const fallbackScripts = client.scripts([published.js]);

        await sleep(500);
        await server.close();

        expect(fallbackScripts[0]).toMatch(published.js);
        expect(client.bundleURL).not.toHaveBeenCalled();
    },
    30000
);

test(
    '.assetUrlByType() method returns empty array when there are no tags',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundleURL = jest.fn();

        await client.sync();

        const published = await client.publish({
            js: resolve(__dirname, '../assets/script.js'),
        });

        await client.bundle({ js: [] });

        const scripts = client.scripts([published.js]);

        await sleep(500);
        await server.close();

        expect(scripts).toHaveLength(0);
        expect(client.bundleURL).not.toHaveBeenCalled();
    },
    30000
);

test(
    '.assetUrlByType() method returns empty array when no hashes given',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundleURL = jest.fn();

        await client.sync();

        client.scripts();
        const scripts = client.assetUrlByType(null, 'js');

        await server.close();

        expect(scripts).toHaveLength(0);
        expect(client.bundleURL).not.toHaveBeenCalled();
    },
    30000
);

test(
    '.assetUrlByType() method returns empty array when empty array of hashes given',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundleURL = jest.fn();

        await client.sync();

        client.styles();
        const scripts = client.assetUrlByType([], 'css');

        await server.close();

        expect(scripts).toHaveLength(0);
        expect(client.bundleURL).not.toHaveBeenCalled();
    },
    30000
);

test(
    '.assetUrlByType() method returns empty array when hashes is a string',
    async () => {
        expect.hasAssertions();
        const { server, port } = await startServer(createAssetServer());

        const client = new Client({
            server: `http://127.0.0.1:${port}`,
            tag: 'test',
        });

        client.bundleURL = jest.fn();

        await client.sync();

        await client.publish({
            js: resolve(__dirname, '../assets/script.js'),
        });

        await client.bundle({ js: ['test'], css: ['test'] });

        const scripts = client.assetUrlByType('not an array', 'js');
        client.assetUrlByType([], 'js');
        client.assetUrlByType(['asd', 'asda'], 'js');
        client.assetUrlByType(null, 'js');
        client.assetUrlByType(undefined, 'js');

        await server.close();

        expect(scripts).toHaveLength(0);
        expect(client.bundleURL).not.toHaveBeenCalled();
    },
    30000
);

test('.bundle() in development mode', async () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true,
    });

    await client.bundle();

    expect(client.bundlePromises).toHaveLength(0);
});

test('.publish() in development mode', async () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true,
    });

    await client.publish();

    expect(client.publishPromises).toHaveLength(0);
});
