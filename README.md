# Lyra Chrome Extension

## Get Started

This project builds a Chrome extension that handles authentication as well as a
"playground" to test out the public facing API that Lyra provides. This
playground calls the Lyra API exactly how a client site like
accountviewer.stellar.org would call it

### Install project dependencies

Navigate to this project folder in Terminal and run

```
yarn
```

### Build the extension and install it on your machine

We will compile the code for the extension and that load this local instance
into your browser.

1. Run

```
yarn build
```

2. Now, in Chrome, navigate to `chrome://extensions/`.

3. Toggle `Developer mode` to the ON position in the top right corner

4. You will now see a button in the top left titled `Load Unpacked`

5. Click `Load Unpacked` and it will open your file system. Navigate to this
   folder and click the `build` folder. Hit `Select`. You should now see an icon
   for Lyra in Chrome.

### Create a dev environment for the Playground to run in

We need to not only create a local dev server, but also alias it with a proper
url (in this case, `lyraClient.com`). This is necessary because for security
purposes, the extension whitelists communication from specific urls. Domains
that we do not whitelist are not able to communicate with Lyra and retrieve data
from it.

1. Update your hosts file by running

```
yarn run addClient
```

2. Start a local dev server

```
yarn start
```

Done! You should be able to access the Playground by going to
`http://lyraclient.com:9000/playground.html` in your browser

### Project Setup

This app has 3 main components that are named using Chrome extension
nomenclature. All of these are located in the `src/` folder:

1. The UI that appears when you click on the Chrome extension in your browser.
   This is simply a normal UI app, in this case using React. In Chrome parlance,
   this is called the `popup` and is therefore located in `src/popup`

2. The API that is exposed to client websites. This API is automatically
   injected into ANY website a user visits while they have Lyra installed. For
   security purposes, we whitelist specific domains that can _successfully_
   called API methods. Example: `laboratory.stellar.org` wants to interact with
   Lyra, perhaps to request a user's public key from the extension. A dev for
   `laboratory.stellar.org` would call this API to get that data from Lyra. In
   Chrome parlance, this is known as a `content script`. It is instaniated on a
   client website by `public/contentScript.js`. For clarity, and ease of sharing
   code, the API methods are defined in `src/lyraApi`.

3. The "backend" service. We want to do things like account creation and store
   sensitive data, like public keys, in a secure place away from the `popup` and
   away from the `content script`. We want this service to be a standalone
   entity that these other 2 can make requests to and receive only what the
   backend sees fit. In Chrome terms, this is known as the `background` script
   and is instantiated by `public/background`. The code is located in
   `src/background`.

This script is run by the Chrome extension on browser starts and continues
running, storing data and listening/responding to messages from the other
`popup` and `content script`, and only terminates on browser close (or extension
uninstall/reload). It is run in a headless browser, so it has access to all Web
APIs and Chrome APIs. It also has accessible dev tools, which can be reached by
going to `chrome://extensions/` and clicking `inspect views: background page`

## Other parts of the codebase

All helpers, statics, etc. that are shared by the 3 components are located in
the top level of `src`.

The `public` folder contains all extension specific instantiation and assets. It
also contains the code for the aforementioned `Playground`.
