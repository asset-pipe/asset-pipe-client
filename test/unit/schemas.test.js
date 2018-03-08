'use strict';

const Joi = require('joi');
const schemas = require('../../lib/schemas');

test('file schema allows for file with .js extension', () => {
    const result = Joi.validate('index.js', schemas.file);
    expect(result.error).toEqual(null);
});

test('file schema allows for file with .css extension', () => {
    const result = Joi.validate('index.css', schemas.file);
    expect(result.error).toEqual(null);
});

test('file schema does not allow for non .js/.css file extensions', () => {
    const result = Joi.validate('index.json', schemas.file);
    expect(result.error).toMatchSnapshot();
});

test('file schema allows for absolute file paths', () => {
    const result = Joi.validate('/path/to/index.js', schemas.file);
    expect(result.error).toEqual(null);
});

test('hash schema', () => {
    const hash = 'a1b2c3a1b2c3';
    const result = Joi.validate(hash, schemas.hash);
    expect(result.error).toEqual(null);
});

test('hash schema bad character', () => {
    const hash = 'ggggggggggg';
    const result = Joi.validate(hash, schemas.hash);
    expect(result.error).toBeTruthy();
});

test('hash schema bad character length', () => {
    const hash = '';
    const result = Joi.validate(hash, schemas.hash);
    expect(result.error).toBeTruthy();
});

test('hash array schema bad length', () => {
    const hashArray = [];
    const result = Joi.validate(hashArray, schemas.hashArray);
    expect(result.error).toBeTruthy();
});

test('hash array - single item validates', () => {
    const hashArray = ['a1b2c3d4e5f6'];
    const result = Joi.validate(hashArray, schemas.hashArray);
    expect(result.error).toEqual(null);
});

test('hash array - multiple items validates', () => {
    const hashArray = ['a1b2c3d4e5f6', 'a1b2c3d4e5f6'];
    const result = Joi.validate(hashArray, schemas.hashArray);
    expect(result.error).toEqual(null);
});
