# Lyra Chrome Extension

## Get Started

This project builds a Chrome extension that handles authentication as well as a
"playground" to test out the public facing API that Lyra provides. This
playground calls the Lyra API exactly how a client site like
accountviewer.stellar.org would call it

### Prerequesites

This project requires nodeJS https://nodejs.org/en/download/

After that, we will need Yarn to install our dependencies.

In Terminal, run

```
brew install yarn
```

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

2. Now, in Chrome, navigate to `chrome://extensions/`. You will see a button in
   the top left titled `Load Unpacked`

3. Click `Load Unpacked` and it will open your file system. Navigate to this
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
