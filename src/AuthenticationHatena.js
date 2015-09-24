// LICENSE : MIT
"use strict";
import assert from "assert";
import BrowserWindow from 'browser-window'
import {OAuth} from "oauth";
import {buildScope} from "./hatenaOauth";
// ref: https://github.com/kymmt90/blog/blob/76fe9265df6f55b13d6ecd2d33168464926259bd/hatena_oauth.md
// http://qiita.com/n0bisuke/items/c12963e0bde614443adf
const OAuthProvider = {
    requestTokenURL: "https://www.hatena.com/oauth/initiate",
    accessTokenURL: "https://www.hatena.com/oauth/token",
    authorizeURL: "https://www.hatena.ne.jp/oauth/authorize?oauth_token="
};
export default class AuthenticationWindow {
    constructor({ key , secret , scopes=[]}) {
        assert(key, "OAuth Consumer Key is needed!");
        assert(secret, "OAuth Consumer Secret is needed!");
        var scopeQuery = scopes.length > 0 ? `?scope=${buildScope(scopes)}` : "";
        this.consumerKey = key;
        this.consumerSecret = secret;
        this.OAuthProvider = {
            requestTokenURL: `${OAuthProvider.requestTokenURL}${scopeQuery}`,
            accessTokenURL: OAuthProvider.accessTokenURL
        };
        this.window = null;
        this.resolve = null;
        this.reject = null;
    }

    startRequest() {
        var oauth = new OAuth(
            this.OAuthProvider.requestTokenURL,
            this.OAuthProvider.accessTokenURL,
            this.consumerKey,
            this.consumerSecret,
            "1.0",
            "http://example.com/auth/callback",
            "HMAC-SHA1"
        );
        var deferredPromise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret) => {
            if (error) {
                return this.reject(error);
            }
            var oauthRequestToken = oauthToken;
            var oauthRequestTokenSecret = oauthTokenSecret;
            var authorizeURL = OAuthProvider.authorizeURL + oauthRequestToken;
            this.getAccessToken(oauth, oauthRequestToken, oauthRequestTokenSecret, authorizeURL);
        });
        return deferredPromise;
    }

    // ref. https://github.com/r7kamura/retro-twitter-client/blob/master/src/browser/authentication-window.js
    getAccessToken(oauth, requestToken, requestTokenSecret, authorizeURL) {
        this.window = new BrowserWindow({width: 800, height: 600, 'node-integration': false});
        this.window.webContents.on('will-navigate', (event, url) => {
            let matched;
            if (matched = url.match(/\?oauth_token=([^&]*)&oauth_verifier=([^&]*)/)) {
                var verified = matched[2];
                oauth.getOAuthAccessToken(requestToken, requestTokenSecret, verified, (error, accessToken, accessTokenSecret) => {
                    if (error) {
                        return this.reject(error);
                    }
                    this.resolve({
                        accessToken: accessToken,
                        accessTokenSecret: accessTokenSecret
                    });
                    setImmediate(() => {
                        this.window.close();
                    });
                });
                event.preventDefault();
            } else if (matched = url.match(/&redirect_after_login_verification=([^&]*)/)) {
                this.window.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl, isMainFrame) => {
                    this.getAccessToken(twitter, requestToken, requestTokenSecret, newUrl);
                });
            }
        });
        this.window.loadUrl(authorizeURL);
    }
}