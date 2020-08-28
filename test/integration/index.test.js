/* eslint-disable no-shadow */

'use strict';

const express = require('express');
const { resolve } = require('path');
const AssetPipeServer = require('@asset-pipe/server');
const Client = require("../..");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createAssetServer() {
    const app = express();
    const server = new AssetPipeServer(null, {
        bundleInProcess: true
    });
    app.use(server.router());
    return app;
}

function startServer(app) {
    return new Promise(resolve => {
        const server = app.listen(() => {
            resolve({
                server,
                port: server.address().port
            });
        });
    });
}

function closeServer(server) {
    return new Promise(resolve => {
        server.close(resolve);
    });
}

test('.scripts()', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    await client.sync();

    const published = await client.publish({
        js: resolve(__dirname, '../assets/script.js')
    });

    await client.bundle({ js: ['test'] });

    const fallbackScripts = client.scripts([published.js]);

    expect(client.verifyingBundle).toEqual({ css: false, js: true });
    await sleep(500);
    client.scripts([published.js]);
    expect(client.verifyingBundle).toEqual({ css: false, js: false });

    await closeServer(server);

    expect(client.hashes.js).toEqual(
        '32bea7be4d163b02785e82b12d1c5f7710b10f063ca19ffe1b722ca7224b124e'
    );

    expect(fallbackScripts[0]).toMatch(
        '/bundle/32bea7be4d163b02785e82b12d1c5f7710b10f063ca19ffe1b722ca7224b124e.js'
    );

    expect(client.scripts([published.js])[0]).toMatch(
        '/bundle/9cef8d745b697dacd6e298b47fb63bb4369942581f7cde24e66e43efab15fd2b.js'
    );
}, 30000);

test('.styles() method', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    await client.sync();

    const published = await client.publish({
        css: resolve(__dirname, '../assets/style.css')
    });

    await client.bundle({ css: ['test'] });

    const fallbackStyles = client.styles([published.css]);

    expect(client.verifyingBundle).toEqual({ css: true, js: false });
    await sleep(500);
    client.styles([published.css]);
    expect(client.verifyingBundle).toEqual({ css: false, js: false });

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
}, 30000);

test('.assetUrlByType() method correctly handles .bundlingComplete() method failure', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundlingComplete = jest.fn(() => Promise.reject(new Error()));

    await client.sync();

    const published = await client.publish({
        js: resolve(__dirname, '../assets/script.js')
    });

    await client.bundle({ js: ['test'] });

    const fallbackScripts = client.scripts([published.js]);

    await sleep(500);
    await server.close();

    expect(fallbackScripts[0]).toMatch(published.js);
    expect(client.bundlingComplete).toHaveBeenCalled();
}, 30000);

test('.assetUrlByType() method falls back when verification underway', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundlingComplete = jest.fn(() => Promise.resolve());

    await client.sync();

    const published = await client.publish({
        js: resolve(__dirname, '../assets/script.js')
    });

    await client.bundle({ js: ['test'] });

    client.verifyingBundle = { css: false, js: true };

    const fallbackScripts = client.scripts([published.js]);

    await sleep(500);
    await server.close();

    expect(fallbackScripts[0]).toMatch(published.js);
    expect(client.bundlingComplete).not.toHaveBeenCalled();
}, 30000);

test(".assetUrlByType() method falls back when given hash count doesn't match tag count", async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundleURL = jest.fn();

    await client.sync();

    const published = await client.publish({
        js: resolve(__dirname, '../assets/script.js')
    });

    await client.bundle({ js: ['test', 'test2'] });

    const fallbackScripts = client.scripts([published.js]);

    await sleep(500);
    await server.close();

    expect(fallbackScripts[0]).toMatch(published.js);
    expect(client.bundleURL).not.toHaveBeenCalled();
}, 30000);

test('.assetUrlByType() method returns empty array when there are no tags', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundleURL = jest.fn();

    await client.sync();

    const published = await client.publish({
        js: resolve(__dirname, '../assets/script.js')
    });

    await client.bundle({ js: [] });

    const scripts = client.scripts([published.js]);

    await sleep(500);
    await server.close();

    expect(scripts).toHaveLength(1);
    expect(client.bundleURL).not.toHaveBeenCalled();
}, 30000);

test('.assetUrlByType() method returns empty array when no hashes given', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundleURL = jest.fn();

    await client.sync();

    client.scripts([]);
    const scripts = client.assetUrlByType([], 'js');

    await server.close();

    expect(scripts).toHaveLength(0);
    expect(client.bundleURL).not.toHaveBeenCalled();
}, 30000);

test('.assetUrlByType() method returns empty array when empty array of hashes given', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundleURL = jest.fn();

    await client.sync();

    client.styles([]);
    const scripts = client.assetUrlByType([], 'css');

    await server.close();

    expect(scripts).toHaveLength(0);
    expect(client.bundleURL).not.toHaveBeenCalled();
}, 30000);

test('.assetUrlByType() method returns empty array when hashes is a string', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    client.bundleURL = jest.fn();

    await client.sync();

    await client.publish({
        js: resolve(__dirname, '../assets/script.js')
    });

    await client.bundle({ js: ['test'], css: ['test'] });

    const scripts = client.assetUrlByType([], 'js');
    client.assetUrlByType(['asd', 'asda'], 'js');

    await server.close();

    expect(scripts).toHaveLength(0);
    expect(client.bundleURL).not.toHaveBeenCalled();
}, 30000);

test('.bundle() in development mode', async () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    await client.bundle();

    expect(client.bundlePromises).toHaveLength(0);
});

test('.publish() in development mode', async () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    await client.publish();

    expect(client.publishPromises).toHaveLength(0);
});

test('publish input validation', () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    expect(() => client.publish()).not.toThrow();
    expect(() => client.publish(null)).toThrow();
    expect(() => client.publish(1)).toThrow();
    expect(() => client.publish({ js: 2 })).toThrow();
    expect(() => client.publish({ css: 1 })).toThrow();
    expect(() => client.publish({ css: null, js: null })).not.toThrow();
});

test('bundle input validation', () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    expect(() => client.bundle()).not.toThrow();
    expect(() => client.bundle(null)).toThrow();
    expect(() => client.bundle(1)).toThrow();
    expect(() => client.bundle({ js: null })).toThrow();
    expect(() => client.bundle({ js: 2 })).toThrow();
    expect(() => client.bundle({ css: null })).toThrow();
    expect(() => client.bundle({ css: 1 })).toThrow();
    expect(() => client.bundle({ css: [1, 2] })).toThrow();
    expect(() => client.bundle({ js: [1, 2] })).toThrow();
    expect(() => client.bundle({ css: [], js: [] })).not.toThrow();
});

test('assetUrlByType input validation', () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    expect(() => client.assetUrlByType()).toThrow();
    expect(() => client.assetUrlByType(null)).toThrow();
    expect(() => client.assetUrlByType(1)).toThrow();
    expect(() => client.assetUrlByType([])).toThrow();

    expect(() => client.assetUrlByType([], '')).toThrow();
    expect(() => client.assetUrlByType([], 'fake')).toThrow();

    expect(() => client.assetUrlByType([1, 2], 'js')).toThrow();
    expect(() => client.assetUrlByType([1, 2], 'css')).toThrow();

    expect(() => client.assetUrlByType([], 'js')).not.toThrow();
    expect(() => client.assetUrlByType([], 'css')).not.toThrow();
    expect(() => client.assetUrlByType(['asd', 'asd'], 'js')).not.toThrow();
    expect(() => client.assetUrlByType(['asd', 'asd'], 'css')).not.toThrow();
});

test('scripts input validation', () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    expect(() => client.scripts(1)).toThrow();
    expect(() => client.scripts([1, 2])).toThrow();

    expect(() => client.scripts()).not.toThrow();
    expect(() => client.scripts([])).not.toThrow();
    expect(() => client.scripts(['asd', 'asd'])).not.toThrow();
});

test('styles input validation', () => {
    expect.hasAssertions();

    const client = new Client({
        server: `http://127.0.0.1:1337`,
        tag: 'test',
        development: true
    });

    expect(() => client.styles(1)).toThrow();
    expect(() => client.styles([1, 2])).toThrow();

    expect(() => client.styles()).not.toThrow();
    expect(() => client.styles([])).not.toThrow();
    expect(() => client.styles(['asd', 'asd'])).not.toThrow();
});

test('scripts() and styles() without bundling', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    await client.sync();
    const scripts = client.scripts(['43sad24a3sd24as3d']);
    const styles = client.styles(['43sad24a3sd24as3d']);
    await closeServer(server);

    expect(scripts[0]).toMatch('43sad24a3sd24as3d');
    expect(styles[0]).toMatch('43sad24a3sd24as3d');
});

test('.styles() method, not waiting for bundle to finish', async () => {
    expect.hasAssertions();
    const { server, port } = await startServer(createAssetServer());

    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    await client.sync();

    await client.publish({
        css: resolve(__dirname, '../assets/style.css')
    });

    client.bundle({ css: ['test'] });
    client.styles(['asd123123']);
    await sleep(500);
    const urls = client.styles(['asd123123']);

    expect(client.verifyingBundle).toEqual({ css: true, js: false });

    await closeServer(server);

    expect(urls[0]).toMatch('asd123123');
    expect(client.hashes.css).toEqual(
        'b67d80ae7bbaa31f4c997c9383902e5b94945d755d94cf263fc9c1c401e531a5'
    );
}, 30000);
