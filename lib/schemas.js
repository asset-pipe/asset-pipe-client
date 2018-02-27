'use strict';

const Joi = require('joi');

/**
 * Validator for a "file" String
 * Regex: https://regexper.com/#%5E%5Ba-zA-Z0-9._-%5D%2B%5C.(js|css)%24
 */

const file = Joi.string()
    .label('entrypoint filename')
    .regex(/^[a-zA-Z0-9._-]+\.(js|css)$/)
    .lowercase()
    .trim()
    .required();

/**
 * Validator for an array of "file" strings
 */

const files = Joi.array()
    .label('entrypoint filenames')
    .items(file);

/**
 * Validator for a "tag" String
 */
const tag = Joi.string()
    .label('tag')
    .alphanum()
    .required();

/**
 * Validator for a "type" String
 */
const type = Joi.any()
    .label('file type')
    .required()
    .valid('js', 'css');

/**
 * Validator for a "bundle instruction" object
 */
const bundleInstruction = Joi.array()
    .label('bundle instruction')
    .items(Joi.string())
    .required();

const options = Joi.object()
    .label('options object')
    .optional();

module.exports = {
    file,
    files,
    tag,
    type,
    bundleInstruction,
    options,
};
