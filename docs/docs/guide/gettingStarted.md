---
id: gettingStarted
title: Getting Started
slug: /
---

To get started, you'll need both the Freighter extension and the API needed to integrate with it.

### Install the Freighter extension.

You'll want a local version of the extension to test with.

- Head over to the [Chrome extension store](https://chrome.google.com/webstore/category/extensions?hl=en) and install Freighter into your browser.

### Install Freighter API

Now we need a way to communicate with the extension. To facilitate this, we create a Javascript library called Freighter-API that will let you send and receives messages from the extension.

#### For ES2023 applications

- Install the module using npm: `npm install @stellar/freighter-api`

or

- Install the module using yarn: `yarn add @stellar/freighter-api`

#### For browser-based applications

- Install the packaged library via script tag using cdnjs, swapping in the [desired version number](https://www.npmjs.com/package/@stellar/freighter-api?activeTab=versions) for `{version}`:

_NOTE:_ You must use version `1.1.2` or above

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/stellar-freighter-api/{version}/index.min.js"></script>
```
