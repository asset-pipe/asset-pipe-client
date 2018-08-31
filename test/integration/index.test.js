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

        await client.bundle({ js: ['test'] });

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

        await client.bundle({ css: ['test'] });

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
