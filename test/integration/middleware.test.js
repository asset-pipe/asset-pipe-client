'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const Client = require('../../');
const { resolve } = require('path');
const request = require('supertest');

function closeServer(server) {
    return new Promise(resolve => {
        server.close(resolve);
    });
}

function createTestServer(handlers) {
    const server = express();
    server.use(bodyParser.json());
    for (const handler of handlers) {
        server[handler.verb](handler.path, handler.cb);
    }
    return new Promise(resolve => {
        const serve = server.listen(() => {
            resolve({
                server: serve,
                port: serve.address().port,
            });
        });
    });
}

test('middleware(), publish=false, development=false', async () => {
    expect.assertions(3);
    const client = new Client({
        buildServerUri: `http://127.0.0.1:1337`,
        tag: 'test',
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css'),
        development: false,
        publish: false,
    });

    client.middleware();

    expect(await client.ready()).toBeTruthy();
    expect(client.js()).toBeFalsy();
    expect(client.css()).toBeFalsy();
});

test('middleware() publish=true, development=false', async () => {
    expect.assertions(2);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify({ id: 'hash' }));
            },
        },
    ]);

    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        tag: 'test',
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css'),
        development: false,
        publish: true,
    });

    const app = express();

    app.use(client.middleware());

    app.get('/', (req, res) => {
        expect(client.js()).toBe('hash');
        expect(client.css()).toBe('hash');
        res.send('ok');
    });

    await request(app).get('/');

    await closeServer(server);
});

test('middleware() publish=false, development=true', async () => {
    expect.assertions(2);

    const client = new Client({
        buildServerUri: `http://127.0.0.1:1337`,
        tag: 'test',
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css'),
        development: true,
        publish: false,
    });

    const app = express();

    app.use(client.middleware());

    const { text: js } = await request(app).get('/js');
    const { text: css } = await request(app).get('/css');

    expect(js).toMatch('console.log');
    expect(css).toMatch('background-color');
});

test('middleware() publish=true, development=true', async () => {
    expect.assertions(5);

    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify({ id: 'hash' }));
            },
        },
    ]);

    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        tag: 'test',
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css'),
        development: true,
        publish: true,
    });

    const app = express();

    app.use(client.middleware());

    expect(await client.ready()).toBeTruthy();
    const { text: js } = await request(app).get('/js');
    const { text: css } = await request(app).get('/css');

    expect(js).toMatch('console.log');
    expect(css).toMatch('background-color');
    expect(client.js()).toBe('hash');
    expect(client.css()).toBe('hash');

    await closeServer(server);
});

test('middleware() publish=true, development=false, missing assets', async () => {
    // expect.assertions(5);

    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify({ id: 'hash' }));
            },
        },
    ]);

    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        tag: 'test',
        development: true,
        publish: true,
    });

    client.middleware();

    await closeServer(server);
});

test('middleware() plugins', async () => {
    jest.resetModules();
    expect.assertions(2);
    const mocks = {
        plugin: jest.fn(),
        transform: jest.fn(),
    };
    jest.doMock(
        '@asset-pipe/dev-middleware',
        () =>
            class MockDevMiddleware {
                constructor() {
                    return mocks;
                }
            }
    );
    const ClientWithMocks = require('../../lib/main');

    const client = new ClientWithMocks({
        buildServerUri: `http://127.0.0.1:1337`,
        tag: 'test',
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css'),
        development: false,
        publish: false,
    });

    client.plugin('fake1', {});
    client.plugin('fake1', {});

    client.transform('fake1', {});
    client.transform('fake2', {});

    client.middleware();

    expect(mocks.plugin).toHaveBeenCalledTimes(2);
    expect(mocks.transform).toHaveBeenCalledTimes(2);

    jest.resetModules();
});
