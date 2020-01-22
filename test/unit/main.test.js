/* eslint-disable consistent-return */
/* eslint-disable global-require */

'use strict';

let Client = require('../../');

const buildServerUri = 'http://server.com:3000';

function createRequestMock(error, response, body) {
    const { PassThrough } = require('stream');
    const mockRequest = (url, callback) => {
        if (error) return callback(error);
        callback(null, response, body);
    };
    mockRequest.post = (options, callback) => {
        const resolve = () => {
            if (error) {
                return callback(error);
            }
            callback(null, response, body);
        };
        if (options.body) {
            return resolve();
        }
        const destination = new PassThrough();
        destination.on('data', () => {});
        destination.on('end', resolve);
        return destination;
    };
    return mockRequest;
}

function createJsWriterMock() {
    const { Readable } = require('stream');
    return jest.fn(() => ({
        plugin: jest.fn(),
        transform: jest.fn(),
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
}

beforeEach(() => {
    jest.resetModules();
});

test('new Client(options) - should throw when missing buildServerUri option', () => {
    expect(() => {
        // eslint-disable-next-line no-new
        new Client();
    }).toThrowError('Expected "server" to be a uri, got undefined');
});

test('new Client(options)', () => {
    const subject = new Client({
        buildServerUri: 'http://127.0.0.1:9999'
    });

    expect(subject.buildServerUri).toEqual('http://127.0.0.1:9999');
    expect(subject.serverId).toEqual(undefined);
    expect(subject.transforms).toHaveLength(0);
    expect(subject.plugins).toHaveLength(0);
});

test('new Client(options) 2', () => {
    const subject = new Client({
        buildServerUri: 'http://127.0.0.1:1111',
        serverId: 'some-server-id'
    });

    expect(subject.buildServerUri).toEqual('http://127.0.0.1:1111');
    expect(subject.serverId).toEqual('some-server-id');
});

test('new Client(options) 3', () => {
    const subject = new Client({ buildServerUri });

    expect(subject.buildServerUri).toEqual('http://server.com:3000');
});

test('transform(transform, options)', () => {
    const subject = new Client({ buildServerUri });
    const transform = jest.fn();
    const options = jest.fn();

    subject.transform(transform, options);

    expect(subject.transforms).toEqual([{ transform, options }]);
});

test('plugin(transform, options)', () => {
    const subject = new Client({ buildServerUri });
    const plugin = jest.fn();
    const options = jest.fn();

    subject.plugin(plugin, options);

    expect(subject.plugins).toEqual([{ plugin, options }]);
});

test('uploadFeed() - files must be an array', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.uploadFeed()).rejects.toMatchSnapshot();
});

test('uploadFeed() - files must contain at least 1 item', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.uploadFeed([])).rejects.toMatchSnapshot();
});

test('uploadFeed() - files array must only contain strings', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.uploadFeed([1, true])).rejects.toMatchSnapshot();
});

test('uploadFeed() - files array must contain .css or .js filenames', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.uploadFeed(['one', 'two'])).rejects.toMatchSnapshot();
});

test('uploadFeed(files) - request error', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('@asset-pipe/js-writer', () => createJsWriterMock());
    Client = require('../../');
    const fakeFiles = ['first.js'];
    const fakeOptions = {};
    const client = new Client({ buildServerUri });

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toThrow('Fake error!');
});

test('createRemoteBundle(sources) - request error', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('@asset-pipe/js-writer', () => createJsWriterMock());
    Client = require('../../');
    const fakeSources = ['a12das3d.json', '12da321fd.json'];
    const client = new Client({ buildServerUri });

    const result = client.createRemoteBundle(fakeSources, 'js');

    await expect(result).rejects.toThrow('Fake error!');
});

test('createRemoteBundle() - missing source argument', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.createRemoteBundle()).rejects.toMatchSnapshot();
});

test('createRemoteBundle(sources) - invalid source argument', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.createRemoteBundle('asd')).rejects.toMatchSnapshot();
});

test('createRemoteBundle(sources) - source argument missing .json ext.', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.createRemoteBundle(['a1c12a45ca1ac1ca1cc1ac1ca1'])
    ).rejects.toMatchSnapshot();
});

test('createRemoteBundle(sources) - missing type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    await expect(
        client.createRemoteBundle(fakeSources)
    ).rejects.toMatchSnapshot();
});

test('createRemoteBundle(sources) - invalid type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const fakeSources = ['a12das3d.json', '12da321fd.json'];

    await expect(
        client.createRemoteBundle(fakeSources, 'fake')
    ).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - tag must be provided', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.publishAssets()).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - tag must be a string', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.publishAssets(1)).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - files must be provided', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.publishAssets('podlet')).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - files must contain at least 1 item', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.publishAssets('podlet', [])).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - files array must only contain strings', async () => {
    expect.assertions(2);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishAssets('podlet', [1, true])
    ).rejects.toMatchSnapshot();

    await expect(client.publishAssets('podlet', 1)).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - files array must contain .css or .js filenames', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishAssets('podlet', ['one', 'two'])
    ).rejects.toMatchSnapshot();
});

test('publishAssets(tag, entrypoints) - request error', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('@asset-pipe/js-writer', () => createJsWriterMock());
    Client = require('../../');
    const client = new Client({ buildServerUri });

    const result = client.publishAssets('podlet', ['first.js'], {});

    await expect(result).rejects.toThrow('Fake error!');
});

test('publishInstructions(tag, type, data) - request error', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('@asset-pipe/js-writer', () => createJsWriterMock());
    Client = require('../../');

    const client = new Client({ buildServerUri });
    const result = client.publishInstructions('layout', 'js', [
        'podlet1',
        'podlet2'
    ]);

    await expect(result).rejects.toThrow('Fake error!');
});

test('publishInstructions(tag, type, data) - missing arguments', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(client.publishInstructions()).rejects.toMatchSnapshot();
});

test('publishInstructions(tag, type, data) - invalid tag argument', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishInstructions(1, 'js', ['podlet1', 'podlet2'])
    ).rejects.toMatchSnapshot();
});

test('publishInstructions(tag, type, data) - empty data', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishInstructions('layout', 'js')
    ).rejects.toMatchSnapshot();
});

test('publishInstructions(tag, type, data) - data not an array', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishInstructions('layout', 'js', {})
    ).rejects.toMatchSnapshot();
});

test('publishInstructions(tag, type, data) - bad data in array', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishInstructions('layout', 'js', [1, 2])
    ).rejects.toMatchSnapshot();
});

test('publishInstructions(tag, type, data) - missing type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishInstructions('layout', null, ['podlet1', 'podlet2'])
    ).rejects.toMatchSnapshot();
});

test('publishInstructions(tag, type, data) - invalid type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    await expect(
        client.publishInstructions('layout', 'fake', ['podlet1', 'podlet2'])
    ).rejects.toMatchSnapshot();
});

test('bundleURL(hashes, options) - js', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const url = client.bundleURL(['a', 'b']);
    expect(url).toBe(
        'http://server.com:3000/bundle/fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603.js'
    );
});

test('bundleURL(hashes, options) - css', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const url = client.bundleURL(['a', 'b'], { type: 'css' });
    expect(url).toBe(
        'http://server.com:3000/bundle/fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603.css'
    );
});

test('bundleURL(hashes, options) - js with prefix', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const url = client.bundleURL(['a', 'b'], { prefix: 'http://server' });
    expect(url).toBe(
        'http://server/fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603.js'
    );
});

test('bundleURL(hashes, options) - empty array returns null', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const url = client.bundleURL([]);
    expect(url).toBe(null);
});

test('bundlingComplete(hashes, options) - empty hashes array returns true', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const isComplete = await client.bundlingComplete([]);
    expect(isComplete).toBe(true);
});

test('bundlingComplete(hashes, options) - empty hashes array returns true', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(null, { statusCode: 200 }));
    Client = require('../../');
    const client = new Client({ buildServerUri });
    const isComplete = await client.bundlingComplete([]);
    expect(isComplete).toBe(true);
});

test('bundlingComplete(hashes, options) - bundle does not exist returns false', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(null, { statusCode: 404 }));
    Client = require('../../');
    const client = new Client({ buildServerUri });
    const isComplete = await client.bundlingComplete(['a12sd2s1a1a1323a']);
    expect(isComplete).toBe(false);
});

test('bundlingComplete(hashes, options) - request throws', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('fake error')));
    Client = require('../../');
    const client = new Client({ buildServerUri });
    await expect(client.bundlingComplete(['a12sd2s1a1a1323a'])).rejects.toEqual(
        new Error('fake error')
    );
});
