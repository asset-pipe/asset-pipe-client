'use strict';

const { URL } = require('url');

function buildURL(baseUrl, params = {}) {
    const url = new URL(baseUrl);

    for (const [name, value] of Object.entries(params)) {
        if (value) {
            let val = value;
            if (value === Object(value)) val = JSON.stringify(value);
            url.searchParams.set(name, val);
        }
    }

    return url.href;
}

module.exports = { buildURL };
