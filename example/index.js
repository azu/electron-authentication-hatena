// LICENSE : MIT
"use strict";

const electron = require('electron');
const dialog = electron.dialog;

const CONSUMER = {
    key: 'elj9OpeplSmpfA==',
    secret: '1hqDhJ2BfB6kozd/nHeLIW7WC/Y='
};
const AuthenticationHatena = require("electron-authentication-hatena");
// http://developer.hatena.com/ja/documents/auth/apis/oauth/consumer
const hatena = new AuthenticationHatena({
    key: CONSUMER.key,
    secret: CONSUMER.secret,
    scopes: ["read_public", "write_public"]
});
hatena.startRequest().then(function (result) {
    var accessToken = result.accessToken;
    var accessTokenSecret = result.accessTokenSecret;
    dialog.showErrorBox("Status", "Token: " + accessToken + "\nSecret: " + accessTokenSecret);
    console.log(accessToken, accessTokenSecret);
}).catch(function (error) {
    console.error(error, error.stack);
});
