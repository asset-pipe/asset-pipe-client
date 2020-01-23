/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
/* eslint-disable global-require */
/* eslint-disable no-shadow */

'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const { resolve } = require('path');

let mockWriter;
const mockPlugin = jest.fn();
const mockTransform = jest.fn();

function closeServer(server) {
    return new Promise(resolve => {
        server.close(resolve);
    });
}

jest.mock('@asset-pipe/js-writer', () => {
    const { Readable } = require('stream');
    mockWriter = jest.fn(() => ({
        plugin: mockPlugin,
        transform: mockTransform,
        bundle: () => {
            const items = [{}, {}, {}, {}];
            return new Readable({
                objectMode: true,
                read() {
                    if (!items.length) {
                        return this.push(null);
                    }
                    this.push(items.shift());
                }
            });
        }
    }));
    return mockWriter;
});

jest.mock('@asset-pipe/css-writer', () => {
    const { Readable } = require('stream');
    const cssWriter = {
        bundle() {
            const items = [{}, {}, {}, {}];
            return new Readable({
                objectMode: true,
                read() {
                    if (!items.length) {
                        return this.push(null);
                    }
                    this.push(items.shift());
                }
            });
        }
    };
    return jest.fn(() => cssWriter);
});

const Client = require('../../');

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
                port: serve.address().port
            });
        });
    });
}

test('uploadFeed(files, options) - js', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb(req, res) {
                res.send({ message: 'Success!' });
            }
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toEqual({ message: 'Success!' });
    await closeServer(server);
});

test('uploadFeed(files, options) - js - with serverId', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb(req, res) {
                res.send({
                    message: `Success! ${req.headers['origin-server-id']}`
                });
            }
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const serverId = `some-server-id-${Math.random()}`;
    const client = new Client({
        serverId,
        buildServerUri: `http://127.0.0.1:${port}`
    });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toEqual({ message: `Success! ${serverId}` });
    await closeServer(server);
});

test('uploadFeed(files, options) - js - uses transforms', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb: (req, res) => res.send('Success!')
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const fakeTransform = { _id: 1 };
    const fakeTransformOptions = { _id: 2 };
    client.transform(fakeTransform, fakeTransformOptions);

    await client.uploadFeed(fakeFiles, fakeOptions);

    expect(mockTransform).toHaveBeenCalledWith(
        fakeTransform,
        fakeTransformOptions
    );
    await closeServer(server);
});

test('uploadFeed(files, options) - js - uses plugins', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb: (req, res) => res.send({ message: 'Success!' })
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const fakePlugin = { _id: 1 };
    const fakePluginOptions = { _id: 2 };
    client.plugin(fakePlugin, fakePluginOptions);

    await client.uploadFeed(fakeFiles, fakeOptions);

    expect(mockPlugin).toHaveBeenCalledWith(fakePlugin, fakePluginOptions);
    await closeServer(server);
});

test('uploadFeed(files) - 200', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb: (req, res) => res.status(200).send({ message: 'Bad request!' })
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toEqual({ message: 'Bad request!' });
    await closeServer(server);
});

test('uploadFeed(files) - 400', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb: (req, res) => res.status(400).send({ message: 'Bad request!' })
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toThrow('Bad request!');
    await closeServer(server);
});

test('uploadFeed(files) - other status codes', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/js',
            cb: (req, res) => res.status(300).send({ message: 'Bad request!' })
        }
    ]);
    const fakeFiles = ['first.js', 'second.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toThrow(
        'Asset build server responded with unknown error. Http status 300'
    );
    await closeServer(server);
});

test('uploadFeed(files) - css', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/feed/css',
            cb: (req, res) => res.status(200).send(req.body)
        }
    ]);
    const fakeFiles = ['first.css', 'second.css', 'third.css'];
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles);

    await expect(result).resolves.toEqual([{}, {}, {}, {}]);
    await closeServer(server);
});

test('createRemoteBundle(sources) - 200', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/js',
            cb: (req, res) => res.send(req.body)
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).resolves.toEqual(fakeSources);
    await closeServer(server);
});

test('createRemoteBundle(sources) - 200 - with serverId', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/js',
            cb: (req, res) => res.send(req.headers['origin-server-id'])
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];
    const serverId = `anather-server-id-${Math.random()}`;
    const client = new Client({
        serverId,
        buildServerUri: `http://127.0.0.1:${port}`
    });
    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).resolves.toEqual(serverId);
    await closeServer(server);
});

test('createRemoteBundle(sources) - 200 - without serverId', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/js',
            cb: (req, res) => res.send(`${req.headers['origin-server-id']}`)
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];
    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`
    });
    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).resolves.toEqual('undefined');
    await closeServer(server);
});

test('createRemoteBundle(sources) - css', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/css',
            cb: (req, res) => res.send(req.body)
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources, 'css');

    await expect(result).resolves.toEqual(fakeSources);
    await closeServer(server);
});

test('createRemoteBundle(sources) - 202', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/js',
            cb: (req, res) => res.status(202).send({ message: 'success 202' })
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).resolves.toEqual({ message: 'success 202' });
    await closeServer(server);
});

test('createRemoteBundle(sources) - 400', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/js',
            cb: (req, res) => res.status(400).send({ message: 'Bad request' })
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).rejects.toThrow('Bad request');
    await closeServer(server);
});

test('createRemoteBundle(sources) - other status codes', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/bundle/js',
            cb: (req, res) =>
                res.status(420).send({ message: "It's that time again" })
        }
    ]);
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).rejects.toThrow(
        'Asset build server responded with unknown error. Http status 420. Original message: "It\'s that time again".'
    );
    await closeServer(server);
});

test('publishAssets(tag, files, options) - 400 error', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.status(400).send({ message: 'Bad request' });
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.publishAssets('podlet1', ['first.js', 'second.js']);

    await expect(result).rejects.toEqual(new Error('Bad request'));
    await closeServer(server);
});

test('publishAssets(tag, files, options) - 500 error', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.status(500).send({ message: 'Server error' });
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.publishAssets('podlet1', ['first.js', 'second.js']);

    await expect(result).rejects.toMatchSnapshot();
    await closeServer(server);
});

test('publishAssets(tag, files, options) - js', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = await client.publishAssets('podlet1', [
        'first.js',
        'second.js'
    ]);

    expect(result).toMatchSnapshot();
    await closeServer(server);
});

test('publishAssets(tag, files, options) - js - minify options', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(req.query);
            }
        }
    ]);
    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        minify: true,
        sourceMaps: true
    });

    const result = await client.publishAssets('a', ['b.js']);
    expect(result).toMatchSnapshot();
    await closeServer(server);
});

test('publishAssets(tag, files, options) - js - query params', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(req.query);
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = await Promise.all([
        await client.publishAssets('a', ['b.js'], { minify: true }),
        await client.publishAssets('a', ['b.js'], { minify: false }),
        await client.publishAssets('a', ['b.js'], { sourceMaps: true }),
        await client.publishAssets('a', ['b.js'], { sourceMaps: false }),
        await client.publishAssets('a', ['b.js'], { minify: null }),
        await client.publishAssets('a', ['b.js'], { sourceMaps: null })
    ]);

    expect(result).toMatchSnapshot();
    await closeServer(server);
});

test('publishAssets(tag, files, options) - js - query params overrides options', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(req.query);
            }
        }
    ]);
    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        minify: true,
        sourceMaps: true
    });

    const result = await client.publishAssets('a', ['b.js'], {
        minify: false,
        sourceMaps: false
    });
    expect(result).toMatchSnapshot();
    await closeServer(server);
});

test('publishAssets(tag, files, options) - uses plugins', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const fakePlugin = { _id: 10 };
    const fakePluginOptions = { _id: 20 };
    client.plugin(fakePlugin, fakePluginOptions);

    await client.publishAssets('podlet1', ['first.js', 'second.js']);

    expect(mockPlugin).toHaveBeenCalledWith(fakePlugin, fakePluginOptions);
    await closeServer(server);
});

test('publishAssets(tag, files, options) - uses transforms', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const fakeTransform = { _id: 30 };
    const fakeTransformOptions = { _id: 40 };
    client.transform(fakeTransform, fakeTransformOptions);

    await client.publishAssets('podlet1', ['first.js', 'second.js']);

    expect(mockTransform).toHaveBeenCalledWith(
        fakeTransform,
        fakeTransformOptions
    );
    await closeServer(server);
});

test('publishAssets(tag, files, options) - css', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = await client.publishAssets('podlet1', [
        'first.css',
        'second.css'
    ]);

    expect(result).toMatchSnapshot();
    await closeServer(server);
});

test('publishInstructions(tag, type, data) - js', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.send(req.body)
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = await client.publishInstructions('layout', 'js', [
        'a12das3d.json',
        '12da321fd.json'
    ]);

    expect(result).toMatchSnapshot();

    await closeServer(server);
});

test('publishInstructions(tag, type, data) - js - options', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.send(req.query)
        }
    ]);

    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        minify: true,
        sourceMaps: true
    });
    const result = await client.publishInstructions('a', 'js', ['b']);

    expect(result).toMatchSnapshot();

    await closeServer(server);
});

test('publishInstructions(tag, type, data) - js - query params', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.send(req.query)
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = await Promise.all([
        client.publishInstructions('a', 'js', ['b'], { minify: true }),
        client.publishInstructions('a', 'js', ['b'], { minify: false }),
        client.publishInstructions('a', 'js', ['b'], { sourceMaps: true }),
        client.publishInstructions('a', 'js', ['b'], { sourceMaps: false }),
        client.publishInstructions('a', 'js', ['b'], { minify: null }),
        client.publishInstructions('a', 'js', ['b'], { sourceMaps: null })
    ]);

    expect(result).toMatchSnapshot();

    await closeServer(server);
});

test('publishInstructions(tag, type, data) - js - query params overrides options', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.send(req.query)
        }
    ]);

    const client = new Client({
        buildServerUri: `http://127.0.0.1:${port}`,
        minify: true,
        sourceMaps: true
    });
    const result = await client.publishInstructions('a', 'js', ['b'], {
        minify: false,
        sourceMaps: false
    });

    expect(result).toMatchSnapshot();

    await closeServer(server);
});

test('publishInstructions(tag, type, data) - css', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.send(req.body)
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = await client.publishInstructions('layout', 'css', [
        'a12das3d.json',
        '12da321fd.json'
    ]);

    expect(result).toMatchSnapshot();

    await closeServer(server);
});

test('publishInstructions(tag, type, data) - 400', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.status(400).send({ message: 'Bad request' })
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.publishInstructions('layout', 'css', [
        'a12das3d.json',
        '12da321fd.json'
    ]);

    await expect(result).rejects.toEqual(new Error('Bad request'));

    await closeServer(server);
});

test('publishInstructions(tag, type, data) - 500', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.status(500).send({ message: 'Server error' })
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.publishInstructions('layout', 'css', [
        'a12das3d.json',
        '12da321fd.json'
    ]);

    await expect(result).rejects.toMatchSnapshot();

    await closeServer(server);
});

test('sync() - 200', async () => {
    expect.assertions(2);
    const { server, port } = await createTestServer([
        {
            verb: 'get',
            path: '/sync',
            cb: (req, res) =>
                res.json({ publicBundleUrl: 'a', publicFeedUrl: 'b' })
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    await client.sync();

    expect(client.publicBundleUrl).toBe('a');
    expect(client.publicFeedUrl).toBe('b');

    await closeServer(server);
});

test('sync() - 500', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'get',
            path: '/sync',
            cb: (req, res) => res.status(200).send('undefined')
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    await expect(client.sync()).rejects.toThrowError();

    await closeServer(server);
});

test('sync() - called when values already cached', async () => {
    expect.assertions(2);
    const { server, port } = await createTestServer([
        {
            verb: 'get',
            path: '/sync',
            cb: (req, res) =>
                res.json({ publicBundleUrl: 'a', publicFeedUrl: 'b' })
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    client.publicBundleUrl = 'http://test';
    client.publicFeedUrl = 'http://test';

    await client.sync();

    expect(client.publicBundleUrl).toBe('http://test');
    expect(client.publicFeedUrl).toBe('http://test');

    await closeServer(server);
});

test('sync() - called when publicFeedUrl already cached but not publicBundleUrl', async () => {
    expect.assertions(2);
    const { server, port } = await createTestServer([
        {
            verb: 'get',
            path: '/sync',
            cb: (req, res) =>
                res.json({ publicBundleUrl: 'a', publicFeedUrl: 'b' })
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    client.publicFeedUrl = 'http://test';

    await client.sync();

    expect(client.publicBundleUrl).toBe('a');
    expect(client.publicFeedUrl).toBe('b');

    await closeServer(server);
});

test('metrics - sync() endpoint', async () => {
    expect.assertions(4);
    const { server, port } = await createTestServer([
        {
            verb: 'get',
            path: '/sync',
            cb: (req, res) =>
                res.json({ publicBundleUrl: 'a', publicFeedUrl: 'b' })
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    expect(client.publicFeedUrl).toEqual(null);
    expect(client.publicBundleUrl).toEqual(null);

    await client.sync();

    expect(client.publicFeedUrl).toEqual('b');
    expect(client.publicBundleUrl).toEqual('a');

    await closeServer(server);
});

test('metrics - publishAssets() endpoint', async done => {
    expect.assertions(2);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const metrics = [];
    client.metrics.on('data', metric => metrics.push(metric));

    client.metrics.on('end', () => {
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe('publish_assets_timer');
        done();
    });

    await client.publishAssets('podlet1', ['first.js', 'second.js']);

    client.metrics.push(null);

    await closeServer(server);
});

test('metrics - publishInstructions() endpoint', async done => {
    expect.assertions(2);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb: (req, res) => res.send(req.body)
        }
    ]);

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const metrics = [];
    client.metrics.on('data', metric => metrics.push(metric));

    client.metrics.on('end', () => {
        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe('publish_instructions_timer');
        done();
    });

    await client.publishInstructions('layout', 'js', [
        'a12das3d.json',
        '12da321fd.json'
    ]);

    client.metrics.push(null);

    await closeServer(server);
});

test('publish', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify({ id: '1adsa3d123as1a3ds123' }));
            }
        }
    ]);
    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    const result = await client.publish({
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css')
    });

    await closeServer(server);

    expect(result).toEqual({
        css: '1adsa3d123as1a3ds123',
        js: '1adsa3d123as1a3ds123'
    });
});

test('bundle', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-instructions',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    const result = await client.bundle({ js: ['test'], css: ['test'] });
    await closeServer(server);

    expect(result).toEqual([
        { data: ['test'], tag: 'test', type: 'js' },
        { data: ['test'], tag: 'test', type: 'css' }
    ]);
});

test('ready', async () => {
    expect.assertions(1);
    const { server, port } = await createTestServer([
        {
            verb: 'post',
            path: '/publish-assets',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        },
        {
            verb: 'post',
            path: '/publish-instructions',
            cb(req, res) {
                res.send(JSON.stringify(req.body));
            }
        }
    ]);
    const client = new Client({
        server: `http://127.0.0.1:${port}`,
        tag: 'test'
    });

    await client.publish({
        js: resolve(__dirname, '../assets/script.js'),
        css: resolve(__dirname, '../assets/style.css')
    });
    await client.bundle({ js: ['test'], css: ['test'] });

    await closeServer(server);

    expect(client.ready()).resolves.toBe(true);
});
