'use strict';

let Client = require('../../');

const buildServerUri = 'http://server';

function createRequestMock(error, response, body) {
    const { PassThrough } = require('stream');
    return {
        post(options, callback) {
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
        },
    };
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
                },
            });
        },
    }));
}

beforeEach(() => {
    jest.resetModules();
});

test('new Client(options) - should throw when missing buildServerUri option', () => {
    expect(() => {
        // eslint-disable-next-line no-new
        new Client();
    }).toThrowError('Expected "buildServerUri" to be a uri, got undefined');
});

test('new Client(options)', () => {
    const subject = new Client({
        buildServerUri: 'http://127.0.0.1:9999',
    });

    expect(subject.buildServerUri).toEqual('http://127.0.0.1:9999');
    expect(subject.serverId).toEqual(undefined);
    expect(subject.transforms).toHaveLength(0);
    expect(subject.plugins).toHaveLength(0);
});

test('new Client(options) 2', () => {
    const subject = new Client({
        buildServerUri: 'http://127.0.0.1:1111',
        serverId: 'some-server-id',
    });

    expect(subject.buildServerUri).toEqual('http://127.0.0.1:1111');
    expect(subject.serverId).toEqual('some-server-id');
});

test('new Client(options) 3', () => {
    const subject = new Client({ buildServerUri });

    expect(subject.buildServerUri).toEqual('http://server');
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

    try {
        await client.uploadFeed();
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('uploadFeed() - files must contain at least 1 item', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.uploadFeed([]);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('uploadFeed() - files array must only contain strings', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.uploadFeed([1, true]);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('uploadFeed() - files array must only contain strings', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.uploadFeed([1, true]);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('uploadFeed() - files array must contain .css or .js filenames', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.uploadFeed(['one', 'two']);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
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

    await expect(result).rejects.toEqual(new Error('Fake error!'));
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

    await expect(result).rejects.toEqual(new Error('Fake error!'));
});

test('createRemoteBundle() - missing source argument', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.createRemoteBundle();
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('createRemoteBundle(sources) - invalid source argument', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.createRemoteBundle('asd');
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('createRemoteBundle(sources) - source argument missing .json ext.', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.createRemoteBundle(['a1c12a45ca1ac1ca1cc1ac1ca1']);
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('createRemoteBundle(sources) - missing type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const fakeSources = ['a12das3d.json', '12da321fd.json'];
    try {
        await client.createRemoteBundle(fakeSources);
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('createRemoteBundle(sources) - invalid type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    const fakeSources = ['a12das3d.json', '12da321fd.json'];
    try {
        await client.createRemoteBundle(fakeSources, 'fake');
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - tag must be provided', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.publishAssets();
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - tag must be a string', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.publishAssets(1);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - files must be an array', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.publishAssets('podlet');
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - files must contain at least 1 item', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.publishAssets('podlet', []);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - files array must only contain strings', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.publishAssets('podlet', [1, true]);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - files array must contain .css or .js filenames', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });

    try {
        await client.publishAssets('podlet', ['one', 'two']);
    } catch (error) {
        expect(error).toMatchSnapshot();
    }
});

test('publishAssets(tag, entrypoints) - request error', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('@asset-pipe/js-writer', () => createJsWriterMock());
    Client = require('../../');
    const client = new Client({ buildServerUri });

    const result = client.publishAssets('podlet', ['first.js'], {});

    await expect(result).rejects.toEqual(new Error('Fake error!'));
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
        'podlet2',
    ]);

    await expect(result).rejects.toEqual(new Error('Fake error!'));
});

test('publishInstructions(tag, type, data) - missing arguments', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions();
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishInstructions(tag, type, data) - invalid tag argument', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions(1, 'js', ['podlet1', 'podlet2']);
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishInstructions(tag, type, data) - empty data', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions('layout', 'js');
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishInstructions(tag, type, data) - data not an array', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions('layout', 'js', {});
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishInstructions(tag, type, data) - bad data in array', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions('layout', 'js', [1, 2]);
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishInstructions(tag, type, data) - missing type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions('layout', null, [
            'podlet1',
            'podlet2',
        ]);
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});

test('publishInstructions(tag, type, data) - invalid type', async () => {
    expect.assertions(1);
    const client = new Client({ buildServerUri });
    try {
        await client.publishInstructions('layout', 'fake', [
            'podlet1',
            'podlet2',
        ]);
    } catch (err) {
        expect(err).toMatchSnapshot();
    }
});
