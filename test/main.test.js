'use strict';

let Client;
let express;
let Writer;
let pluginMock;
let transformMock;

function mockWriter () {
    const { Readable } = require('stream');
    jest.doMock('asset-pipe-js-writer');
    Writer = require('asset-pipe-js-writer');
    pluginMock = jest.fn();
    transformMock = jest.fn();
    Writer.mockImplementation(() => ({
        plugin: pluginMock,
        transform: transformMock,
        bundle: () => {
            const items = [{}, {}, {}, {}];
            return new Readable({
                objectMode: true,
                read () {
                    if (!items.length) {
                        return this.push(null);
                    }
                    this.push(items.shift());
                },
            });
        },
    }));
}

function createTestServer (handlers) {
    const server = express();
    for (const handler of handlers) {
        server[handler.verb](handler.path, handler.cb);
    }
    return new Promise(resolve => {
        const serve = server.listen(() => {
            resolve(serve.address().port);
        });
    });
}

beforeEach(() => {
    jest.resetModules();
    mockWriter();
    Client = require('../');
    express = require('express');
});

test('new Client(options)', () => {
    expect.assertions(3);
    const subject = new Client();

    expect(subject.options).toEqual({
        buildServerUri: 'http://127.0.0.1:7100',
    });
    expect(subject.transforms).toHaveLength(0);
    expect(subject.plugins).toHaveLength(0);
});

test('new Client(options)', () => {
    expect.assertions(1);
    const buildServerUri = 'http://server';
    const subject = new Client({ buildServerUri });

    expect(subject.options).toEqual({
        buildServerUri: 'http://server',
    });
});

test('transform(transform, options)', () => {
    expect.assertions(1);
    const subject = new Client();
    const transform = jest.fn();
    const options = jest.fn();

    subject.transform(transform, options);

    expect(subject.transforms).toEqual([{ transform, options }]);
});

test('plugin(transform, options)', () => {
    expect.hasAssertions();
    const subject = new Client();
    const plugin = jest.fn();
    const options = jest.fn();

    subject.plugin(plugin, options);

    expect(subject.plugins).toEqual([{ plugin, options }]);
});

test('uploadFeed(files, options) - js', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.send('Success!'),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toBe('Success!');
});

test('uploadFeed(files, options) - js - uses transforms', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.send('Success!'),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const fakeTransform = { _id: 1 };
    const fakeTransformOptions = { _id: 2 };
    client.transform(fakeTransform, fakeTransformOptions);

    const result = await client.uploadFeed(fakeFiles, fakeOptions);

    expect(transformMock.mock.calls[0]).toEqual([fakeTransform, fakeTransformOptions]);
});

test('uploadFeed(files, options) - js - uses plugins', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.send('Success!'),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const fakePlugin = { _id: 1 };
    const fakePluginOptions = { _id: 2 };
    client.plugin(fakePlugin, fakePluginOptions);

    const result = await client.uploadFeed(fakeFiles, fakeOptions);

    expect(pluginMock.mock.calls[0]).toEqual([fakePlugin, fakePluginOptions]);
});

test.skip('uploadFeed(files) - request error', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(400).send('Bad request!'),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toBe('Success!');
});

test('uploadFeed(files) - 200', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(200).send('Bad request!'),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).resolves.toBe('Bad request!');
});

test('uploadFeed(files) - 400', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(400).send({ message: 'Bad request!' }),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toEqual(new Error('Bad request!'));
});

test('uploadFeed(files) - other status codes', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/feed',
            cb: (req, res) => res.status(300).send('Bad request!'),
        },
    ]);
    const fakeFiles = [];
    const fakeOptions = {};
    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toEqual(new Error('Asset build server responded with unknown error. Http status 300'));
});

test.skip('uploadFeed(files) - css');

test.skip('createRemoteBundle(sources) - request error', async () => {
    expect.hasAssertions();
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res, next) => next(new Error('Error!')),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).rejects.toBe('Error!');
});

test('createRemoteBundle(sources) - 200', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.send('success!'),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).resolves.toBe('success!');
});

test('createRemoteBundle(sources) - 202', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.status(202).send('success 202'),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).resolves.toBe('success 202');
});

test('createRemoteBundle(sources) - 400', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.status(400).send({ message: 'Bad request' }),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).rejects.toEqual(new Error('Bad request'));
});

test('createRemoteBundle(sources) - other status codes', async () => {
    expect.assertions(1);
    const port = await createTestServer([
        {
            verb: 'post',
            path: '/bundle',
            cb: (req, res) => res.status(204).send(),
        },
    ]);
    const fakeSources = ['a12das3d', '12da321fd'];

    const client = new Client({ buildServerUri: `http://127.0.0.1:${port}` });
    const result = client.createRemoteBundle(fakeSources);

    await expect(result).rejects.toEqual(new Error('Asset build server responded with unknown error. Http status 204'));
});
