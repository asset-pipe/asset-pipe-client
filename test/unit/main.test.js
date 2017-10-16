'use strict';

let Client = require('../../');

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

test('uploadFeed() - files must be an array', () => {
    expect.assertions(1);
    const client = new Client();

    const result = () => client.uploadFeed();

    expect(result).toThrowErrorMatchingSnapshot();
});

test('uploadFeed() - files must contain at least 1 item', () => {
    expect.assertions(1);
    const client = new Client();

    const result = () => client.uploadFeed([]);

    expect(result).toThrowErrorMatchingSnapshot();
});

test('uploadFeed() - files array must only contain strings', () => {
    expect.assertions(1);
    const client = new Client();

    const result = () => client.uploadFeed([1, true]);

    expect(result).toThrowErrorMatchingSnapshot();
});

test('uploadFeed() - files array must contain .css or .js filenames', () => {
    expect.assertions(1);
    const client = new Client();

    const result = () => client.uploadFeed(['one', 'two']);

    expect(result).toThrowErrorMatchingSnapshot();
});

test('uploadFeed(files) - request error', async () => {
    expect.assertions(1);
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('asset-pipe-js-writer', () => createJsWriterMock());
    Client = require('../../');
    const fakeFiles = ['first.js'];
    const fakeOptions = {};
    const client = new Client();

    const result = client.uploadFeed(fakeFiles, fakeOptions);

    await expect(result).rejects.toEqual(new Error('Fake error!'));
});

test('createRemoteBundle(sources) - request error', async () => {
    expect.hasAssertions();
    jest.resetModules();
    jest.doMock('request', () => createRequestMock(new Error('Fake error!')));
    jest.doMock('asset-pipe-js-writer', () => createJsWriterMock());
    Client = require('../../');
    const fakeSources = ['a12das3d', '12da321fd'];
    const client = new Client();

    const result = client.createRemoteBundle(fakeSources);

    await expect(result).rejects.toEqual(new Error('Fake error!'));
});
