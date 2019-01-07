// LICENSE : MIT
"use strict";
import assert from "assert";
import { BrowserWindow, session } from 'electron';
import { OAuth } from "oauth";
import { buildScope } from "./hatenaOauth";
// ref: https://github.com/kymmt90/blog/blob/76fe9265df6f55b13d6ecd2d33168464926259bd/hatena_oauth.md
// http://qiita.com/n0bisuke/items/c12963e0bde614443adf
const OAuthProvider = {
    requestTokenURL: "https://www.hatena.com/oauth/initiate",
    accessTokenURL: "https://www.hatena.com/oauth/token",
    authorizeURL: "https://www.hatena.ne.jp/oauth/authorize?oauth_token="
};

export interface AuthenticationWindowOption {
    key: string;
    secret: string;
    scopes: string[];
    provider: typeof OAuthProvider;
    redirectURL: string;
}

export class AuthenticationHatena {
    private consumerKey: string;
    private consumerSecret: string;
    private OAuthProvider: { requestTokenURL: string; authorizeURL: string; accessTokenURL: string };
    private resolve!: (value: any) => void;
    private reject!: (error: any) => void;
    private window!: Electron.BrowserWindow;
    private redirectURL: string;

    constructor({
                    key,
                    secret,
                    scopes = [],
                    provider = OAuthProvider,
                    redirectURL = "https://example.com/auth/callback"
                }: AuthenticationWindowOption) {
        assert(key, "OAuth Consumer Key is needed!");
        assert(secret, "OAuth Consumer Secret is needed!");
        let scopeQuery = scopes.length > 0 ? `?scope=${buildScope(scopes)}` : "";
        this.consumerKey = key;
        this.consumerSecret = secret;
        this.redirectURL = redirectURL;
        this.OAuthProvider = {
            requestTokenURL: `${provider.requestTokenURL}${scopeQuery}`,
            accessTokenURL: provider.accessTokenURL,
            authorizeURL: provider.authorizeURL
        };
    }

    startRequest() {
        let oauth = new OAuth(
            this.OAuthProvider.requestTokenURL,
            this.OAuthProvider.accessTokenURL,
            this.consumerKey,
            this.consumerSecret,
            "1.0",
            this.redirectURL,
            "HMAC-SHA1"
        );
        const deferredPromise = new Promise((resolve, reject) => {
            var isResolved = false;
            this.resolve = (value: any) => {
                if (isResolved) {
                    return;
                }
                isResolved = true;
                resolve(value);
            };
            this.reject = (error: any) => {
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
    getAccessToken(oauth: OAuth, requestToken: string, requestTokenSecret: string, authorizeURL: string) {
        this.window = new BrowserWindow({ width: 800, height: 600 });
        this.window.on("close", () => {
            this.reject(new Error("the window is closed before complete the authentication."));
        });
        const onLoadURL = (url: string, preventDefault?: () => void) => {
            let matched;
            // + pass decoded url as verifier
            let decodedURL = decodeURIComponent(url);
            if (matched = decodedURL.match(/\?oauth_token=([^&]*)&oauth_verifier=([^&]*)/)) {
                // @ts-ignore
                let [_all, _oauthToken, oauthVerifier] = matched;
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
                if (preventDefault) {
                    preventDefault();
                }
            }
        };

        const filter = {
            urls: [this.redirectURL + '*']
        };
        if (!session.defaultSession) {
            throw new Error("Not found default session on Electron Window")
        }
        session.defaultSession.webRequest.onCompleted(filter, (details) => {
            const url = details.url;
            onLoadURL(url);
        });
        this.window.webContents.on('will-navigate', (event, url) => {
            onLoadURL(url, () => {
                event.preventDefault();
            });
        });
        this.window.loadURL(authorizeURL);
    }
}
