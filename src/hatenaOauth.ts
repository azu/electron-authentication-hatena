// LICENSE : MIT
"use strict";

/**
 * build scope query string from scopes string array.
 * @param {string[]} scopes scopes are string of http://developer.hatena.com/ja/documents/auth/apis/oauth/scopes
 * @returns {string}
 */
export function buildScope(scopes: string[]) {
    return scopes.join("%2C");
}
