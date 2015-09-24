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
    constructor({ key , secret , scopes=[], provider = OAuthProvider}) {
        assert(key, "OAuth Consumer Key is needed!");
        assert(secret, "OAuth Consumer Secret is needed!");
        let scopeQuery = scopes.length > 0 ? `?scope=${buildScope(scopes)}` : "";
        this.consumerKey = key;
        this.consumerSecret = secret;
        this.OAuthProvider = {
            requestTokenURL: `${provider.requestTokenURL}${scopeQuery}`,
            accessTokenURL: provider.accessTokenURL,
            authorizeURL: provider.authorizeURL
        };
        this.window = null;
        this.resolve = null;
        this.reject = null;
    }

    startRequest() {
        let oauth = new OAuth(
            this.OAuthProvider.requestTokenURL,
            this.OAuthProvider.accessTokenURL,
            this.consumerKey,
            this.consumerSecret,
            "1.0",
            "https://example.com/auth/callback",
            "HMAC-SHA1"
        );
        let deferredPromise = new Promise((resolve, reject) => {
            var isResolved = false;
            this.resolve = (value) => {
                if (isResolved) {
                    return;
                }
                isResolved = true;
                resolve(value);
            };
            this.reject = (error)=> {
                if (isResolved) {
                    return;
                }
                isResolved = true;
                reject(error);
            };
        });
        oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret) => {
            if (error) {
                return this.reject(error);
            }
            let oauthRequestToken = oauthToken;
            let oauthRequestTokenSecret = oauthTokenSecret;
            let authorizeURL = this.OAuthProvider.authorizeURL + oauthRequestToken;
            this.getAccessToken(oauth, oauthRequestToken, oauthRequestTokenSecret, authorizeURL);
        });
        return deferredPromise;
    }

    // ref. https://github.com/r7kamura/retro-twitter-client/blob/master/src/browser/authentication-window.js
    // http://qiita.com/Quramy/items/fc79cad92bb287478076
    getAccessToken(oauth, requestToken, requestTokenSecret, authorizeURL) {
        this.window = new BrowserWindow({width: 800, height: 600, 'node-integration': false});
        this.window.on("close", () => {
            this.reject(new Error("the window is closed before complete the authentication."));
        });
        this.window.webContents.on('will-navigate', (event, url) => {
            let matched;
            if (matched = url.match(/\?oauth_token=([^&]*)&oauth_verifier=([^&]*)/)) {
                let [all, oauthToken, oauthVerifier] = matched;
                oauth.getOAuthAccessToken(requestToken, requestTokenSecret, oauthVerifier, (error, accessToken, accessTokenSecret) => {
                    if (error) {
                        this.reject(error);
                        setImmediate(() => {
                            this.window.close();
                        });
                        return;
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