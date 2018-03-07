'use strict';

const { buildURL } = require('../../lib/utils');

test('buildURL with no params', () => {
    const result = buildURL('http://server.com');
    expect(result).toEqual('http://server.com/');
});

test('buildURL with 1 param', () => {
    const result = buildURL('http://server.com', { prop: 'value' });
    expect(result).toEqual('http://server.com/?prop=value');
});

test('buildURL with multiple params', () => {
    const result = buildURL('http://server.com', {
        prop1: 'value',
        prop2: 'value',
        prop3: 'value',
    });
    expect(result).toEqual(
        'http://server.com/?prop1=value&prop2=value&prop3=value'
    );
});

test('buildURL with param with undefined value', () => {
    const result = buildURL('http://server.com', { prop: undefined });
    expect(result).toEqual('http://server.com/');
});

test('buildURL with param with null value', () => {
    const result = buildURL('http://server.com', { prop: null });
    expect(result).toEqual('http://server.com/');
});

test('buildURL with object param serialized', () => {
    const result = buildURL('http://server.com', { prop: { key: 'value' } });
    expect(result).toEqual(
        'http://server.com/?prop=%7B%22key%22%3A%22value%22%7D'
    );
});

test('buildURL with array param serialized', () => {
    const result = buildURL('http://server.com', { prop: ['one', 'two'] });
    expect(result).toEqual(
        'http://server.com/?prop=%5B%22one%22%2C%22two%22%5D'
    );
});

test('buildURL with number param', () => {
    const result = buildURL('http://server.com', { prop: 1 });
    expect(result).toEqual('http://server.com/?prop=1');
});

test('buildURL with boolean param', () => {
    const result = buildURL('http://server.com', { prop: true });
    expect(result).toEqual('http://server.com/?prop=true');
});
