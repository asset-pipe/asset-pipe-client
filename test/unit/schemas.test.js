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
