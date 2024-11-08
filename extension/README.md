# Freighter Web Extension

## Get Started

This project builds a web extension

### Configure the backend

You will need to add a backend for Freighter to connect to. You can configure
this by adding an `.env` file at the path `extension/.env`.

Inside this file, you can configure a backend by setting a value for the global
variable `INDEXER_URL`. For example, to connect to the production backend, in
your `.env` file, you can add the line
`INDEXER_URL=https://freighter-backend.stellar.org/api/v1`.

To connect to a local instance of the backend, just swap out the value in
`INDEXER_URL`.

### Build the extension and install it on your machine

We will compile the code for the extension and then load this package into your
browser.

Run

```
yarn build
```

You may also choose to enable some experimental features by alternatively
running

```
yarn build:experimental
```

To install on Chrome:

1. In Chrome, navigate to `chrome://extensions/`.

2. Toggle `Developer mode` to the ON position in the top right corner

3. You will now see a button in the top left titled `Load Unpacked`

4. Click `Load Unpacked` and it will open your file system.

5. Navigate to this folder (`/extension`) and click the `build` folder. Hit `Select`. You
   should now see an icon for Freighter in Chrome.

To install on Firefox:

1. In Firefox, navigate to about:debugging#/runtime/this-firefox

2. Click `Load Temporary Add-On`

3. Navigate to this folder (`/extension`) and open the `build` folder and find `manifest.json`.
   Hit `Select`. You should now see an icon for Freighter in Firefox

### Build the extension using production settings

When we build for the app store, we will minify our code and enable some
security guardrails. In order to do that, run

```
yarn build:production
```

Note that when you build using this setting and install locally, you will NOT be
able to connect to it using a dev server (mentioned in the next stop)

### Create a dev environment for the Popup and Playground to run in

Next we'll spin up a dev environment. Here, you can access the `popup` in your
browser, so you can make edits with the benefit of hot reloads. This dev
environment will be able to make calls to the installed version of the
extension, so it has all the capabilites of the `popup` inside the extension.

_NOTE: This dev environment only works for the `popup`_

Changes to `background` and `content script` will still require a production
build using `yarn build`, followed by reloading the extension in Chrome.

1. Start a local dev server by running

```
yarn start
```

You should be able to access the Popup by going to `localhost:9000/`

You can also set the `experimental` flag to true by running

```
yarn start:experimental
```

This will enable some features hidden by the `experimental` feature flag that
are still under development.

### Integration Tests

_WARNING: running the intergration tests will clear the apps data_

Steps:

1. Build the extension in experimental mode

```
yarn build:experimental
```

2. Start the dev server

```
yarn start
```

3. Go to the integration tests route

```
localhost:9000/#/integration-test
```

Errors, if any, will be in the console logs.

## Project Setup

This app has 3 main components that are named using extension nomenclature. All
of these are located in the `src/` folder:

1. The UI that appears when you click on the extension in your browser. This
   code also controls the fullscreen authentiction flow and any popups triggered
   by the extension. This is all controlled by one React app. In web extension
   parlance, this is called the `popup` and is therefore located in `src/popup`.

2. The "backend" service. We want to do things like account creation and store
   sensitive data, like public keys, in a secure place away from the `popup` and
   away from the `content script`. We want this service to be a standalone
   entity that these other 2 can make requests to and receive only what the
   backend sees fit. In web extension terms, this is known as the `background`
   script and is instantiated by `public/background`. The code is located in
   `src/background`.

   This script is run by the extension on browser starts and continues running,
   storing data and listening/responding to messages from `popup` and
   `content script`, and only terminates on browser close (or extension
   uninstall/reload). It is run in a headless browser, so it has access to all
   Web APIs. It also has accessible dev tools, which can be reached by going to
   `chrome://extensions/` or `about:debugging#/runtime/this-firefox` and
   clicking `Inspect`

3. The `content script` that allows external sites to send and receive messages
   to `background`. Using an event listener, it waits for an application to
   attempt to communicate using `@stellar/freighter-api`(under the hood,
   `window.postMessage`). Once it picks up a message and determines that this
   from `freighter-api`, it sends the message onto `background`.
