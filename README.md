# electron-authentication-hatena

This [Electron](http://electron.atom.io/ "Electron") library that help to login by OAuth for Hatena.

http://developer.hatena.ne.jp/ja/documents/auth/apis/oauth

## Installation

    npm install electron-authentication-hatena

## Usage

![screenshot](https://monosnap.com/file/MLylHNva1bcWgIWOx88gd8C19RtZ5L.png)

See [example](example/) app.

```
npm run example
```

Code:

```js
const electron = require('electron');
const dialog = electron.dialog;

const CONSUMER = {
    key: '______',
    secret: '_______'
};
const AuthenticationHatena = require("electron-authentication-hatena").AuthenticationHatena;
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

```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT

## Acknowledgement

- http://qiita.com/Quramy/items/fc79cad92bb287478076
