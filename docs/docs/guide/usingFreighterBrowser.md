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

Now let's dig into what functionality is available to you:

### isConnected

#### `isConnected() -> <boolean>`

This function is useful for determining if a user in your application has Freighter installed.

```javascript
if (window.freighterApi.isConnected()) {
  alert("User has Freighter!");
}
```

### getPublicKey

#### `getPublicKey() -> <Promise<string>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive the user's public key. If and when the user accepts, this function will resolve with an object containing the public key. Otherwise, it will provide an error.

If the user has authorized your application previously, it will be on the extension's "Allow list", meaning the extension can immediately provide the public key without any user action.

```javascript
if (window.freighterApi.isConnected()) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  let publicKey = "";
  let error = "";

  try {
    publicKey = await window.freighterApi.getPublicKey();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return publicKey;
};

const result = await retrievePublicKey();
```

### getNetwork

#### `getNetwork() -> <Promise<"PUBLIC" | "TESTNET">>`

This function is useful for determining what network the user has configured Freighter to use. Freighter will be configured to either `PUBLIC` or `TESTNET`.

```javascript
if (window.freighterApi.isConnected()) {
  alert("User has Freighter!");
}

const retrieveNetwork = async () => {
  let network = "";
  let error = "";

  try {
    network = await window.freighterApi.getNetwork();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return network;
};

const result = await retrieveNetwork();
```

### signTransaction

#### `signTransaction(xdr: string, network:? string) -> <Promise<string>>`

This function accepts a transaction XDR string as the first parameter, which it will decode, sign as the user, and then return the signed transaction to your application.

The user will need to provide their password if the extension does not currently have their private key. Once the user has provided their password, the extension will have access to the user private key for 5 minutes. The user must then review the transaction details and accept within those 5 minutes for the transaction to be signed.

_NOTE:_ The user must provide a valid transaction XDR string for the extension to properly sign.

The second parameter is an optional string that you may pass to indicate what network you’re intending this transaction to be signed on. The network must be either `PUBLIC` or `TESTNET`. If you choose not to pass a network, freighter-api will default to `PUBLIC`. You may also pass `null` here if you choose not to pass a network param, but you would like to pass the third param available.

This is useful in the case that the user's Freighter is configured to the wrong network. Freighter will be able to throw a blocking error message communicating that you intended this transaction to be signed on a different network.

```javascript
if (window.freighterApi.isConnected()) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  let publicKey = "";
  let error = "";

  try {
    publicKey = await window.freighterApi.getPublicKey();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return publicKey;
};

const retrievedPublicKey = await retrievePublicKey();

const userSignTransaction = async (
  xdr: string,
  network: string,
  signWith: string
) => {
  let signedTransaction = "";
  let error = "";

  try {
    signedTransaction = await window.freighterApi.signTransaction(
      xdr,
      network,
      signWith
    );
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return signedTransaction;
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign
const userSignedTransaction = await userSignTransaction(xdr, "TESTNET");
```

freighter-api will return a signed transaction xdr. Below is an example of how you might submit this signed transaction to Horizon using `stellar-sdk` (https://github.com/stellar/js-stellar-sdk):

```javascript
const userSignTransaction = async (
  xdr: string,
  network: string,
  signWith: string
) => {
  let signedTransaction = "";
  let error = "";

  try {
    signedTransaction = await window.freighterApi.signTransaction(
      xdr,
      network,
      signWith
    );
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return signedTransaction;
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign

const userSignedTransaction = await userSignTransaction(xdr, "TESTNET");

const SERVER_URL = "https://horizon-testnet.stellar.org";

const server = StellarSdk.Server(SERVER_URL);

const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
  userSignedTransaction,
  SERVER_URL
);

const response = await server.submitTransaction(transactionToSubmit);
```
