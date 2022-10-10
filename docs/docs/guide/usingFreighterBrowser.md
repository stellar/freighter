---
id: usingFreighterBrowser
title: Using Freighter in the browser
---

We now have an extension installed on our machine and a library to interact with it. This library will provide you methods to send and receive data from a user's extension in your website or application.

### Importing

First import the library in the `<head>` tag of your page.

- Install the packaged library via script tag using cdnjs, swapping in the desired version number for `{version}`

_NOTE:_ You must use version `1.1.2` or above

```html
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/stellar-freighter-api/{version}/index.min.js"></script>
</head>
```

This will expose a global variable called `window.freighterApi` that will contain our library.

The call signatures will be exactly the same as the [node version](./usingFreighterNode), but you will call the methods directly from `window.freighterApi`:

For example:

```javascript
if (window.freighterApi.isConnected()) {
  alert("User has Freighter!");
}
```
