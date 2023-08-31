---
id: usingFreighterNode
title: Using Freighter in node.js
---

We now have an extension installed on our machine and a library to interact with it. This library will provide you methods to send and receive data from a user's extension in your website or application.

### Importing

First import the whole library in a Node.js application

```javascript
import freighterApi from "@stellar/freighter-api";
```

or import just the modules you require:

```javascript
import {
  isConnected,
  getPublicKey,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";
```

Now let's dig into what functionality is available to you:

### isConnected

#### `isConnected() -> <Promise<boolean>>`

This function is useful for determining if a user in your application has Freighter installed.

```javascript
import { isConnected } from "@stellar/freighter-api";

if (await isConnected()) {
  alert("User has Freighter!");
}
```

### isAllowed

#### `isAllowed() -> <Promise<boolean>>`

This function is useful for determining if a user has previously authorized your app to receive data from Freighter.

```javascript
import { isAllowed } from "@stellar/freighter-api";

if (await isAllowed()) {
  alert("User has allowed your app!");
}
```

### setAllowed

#### `setAllowed() -> <Promise<boolean>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive user data. If and when the user accepts, this function will resolve with a boolean of `true` indicating the app is now on the extension's "Allow list". This means the extension can immediately provide user data without any user action.

```javascript
import { setAllowed } from "@stellar/freighter-api";

const isAllowed = await setAllowed();

if (isAllowed) {
  alert("Successfully added the app to Freighter's Allow List");
}
```

### getPublicKey

#### `getPublicKey() -> <Promise<string>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive the user's public key. If and when the user accepts, this function will resolve with an object containing the public key. Otherwise, it will provide an error.

If the user has authorized your application previously, it will be on the extension's "Allow list", meaning the extension can immediately provide the public key without any user action.

```javascript
import {
  isConnected,
  getPublicKey,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

if (await isConnected()) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  let publicKey = "";
  let error = "";

  try {
    publicKey = await getPublicKey();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return publicKey;
};

const result = retrievePublicKey();
```

### getUserInfo

#### `getUserInfo() -> <Promise<{ publicKey: string }>>`

Similar to `getPublicKey` above, this will transmit user data from Freighter to an authorized app.

_NOTE:_ An important difference between `getUserInfo` and `getPublicKey` is that `getPublicKey` will prompt a user to allow authorization if they had not previously done so. `getUserInfo` will _not_ prompt the user. If your app has not been authorized, or if a user needs to authenticate inside of Freighter, you will simply receive no data. Use with caution as you may need to use other checks to ensure a good UX. See below for an example

```javascript
import {
  isConnected,
  isAllowed,
  setAllowed,
  getUserInfo,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

if (await isConnected()) {
  alert("User has Freighter!");
}

const retrieveUserInfo = async () => {
  let userInfo = { publicKey: "" };
  let error = "";

  try {
    userInfo = await getUserInfo();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  if (!userInfo.publicKey) {
    // we didn't get anything back. Maybe the app hasn't been authorixed?

    const isAllowed = await isAllowed();

    if (!isAllowed) {
      // oh, we forgot to make sure the app is allowed. Let's do that now
      await setAllowed();

      // now, let's try getting that user info again
      // it should work now that this app is "allowed"
      userInfo = await getUserInfo();
    }
  }

  return userInfo.publicKey;
};

const result = retrieveUserInfo();
```

### getNetwork

#### `getNetwork() -> <Promise<string>>`

This function is useful for determining what network the user has configured Freighter to use. Freighter will be configured to either `PUBLIC` or `TESTNET`.

```javascript
import {
  isConnected,
  getNetwork,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

if (await isConnected()) {
  alert("User has Freighter!");
}

const retrieveNetwork = async () => {
  let network = "";
  let error = "";

  try {
    network = await getNetwork();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return network;
};

const result = retrieveNetwork();
```

### signTransaction

#### `signTransaction(xdr: string, opts?: { network?: string, networkPassphrase?: string, accountToSign?: string }) -> <Promise<string>>`

This function accepts a transaction XDR string as the first parameter, which it will decode, sign as the user, and then return the signed transaction to your application.

The user will need to provide their password if the extension does not currently have their private key. Once the user has provided their password, the extension will have access to the user private key for 5 minutes. The user must then review the transaction details and accept within those 5 minutes for the transaction to be signed.

_NOTE:_ The user must provide a valid transaction XDR string for the extension to properly sign.

The second parameter is an optional `opts` object where you can specify the network you are intending the transaction to be signed on. This `network` name maps to the Networks enum in js-stellar-sdk. Freighter will use this network name to derive the network passphrase from js-stellar-sdk.

If the passphrase you need can't be found in js-stellar-sdk, you can simply pass a custom `networkPassphrase` for Freighter to use. In the event both are passed, Freighter will default to using `network` to derive the passphrase from js-stellar-sdk and ignore `networkPassphrase`.

These 2 configurations are useful in the case that the user's Freighter is configured to the wrong network. Freighter will be able to throw a blocking error message communicating that you intended this transaction to be signed on a different network.

You can also use this `opts` to specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

### signBlob

#### `signBlob(xdr: string, opts: { network: string, networkPassphrase: string, accountToSign: string }) -> <Promise<string>>`

This is the same as `signTransaction` but accepts a base64 encoded blob.

```javascript
import {
  isConnected,
  getPublicKey,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

if (await isConnected()) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  let publicKey = "";
  let error = "";

  try {
    publicKey = await getPublicKey();
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return publicKey;
};

const retrievedPublicKey = retrievePublicKey();

const userSignTransaction = async (
  xdr: string,
  network: string,
  signWith: string
) => {
  let signedTransaction = "";
  let error = "";

  try {
    signedTransaction = await signTransaction(xdr, {
      network,
      accountToSign: signWith,
    });
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return signedTransaction;
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign
const userSignedTransaction = userSignTransaction(xdr, "TESTNET");
```

freighter-api will return a signed transaction xdr. Below is an example of how you might submit this signed transaction to Horizon using `stellar-sdk` (https://github.com/stellar/js-stellar-sdk):

```javascript
import StellarSdk from "stellar-sdk";

const userSignTransaction = async (
  xdr: string,
  network: string,
  signWith: string
) => {
  let signedTransaction = "";
  let error = "";

  try {
    signedTransaction = await signTransaction(xdr, {
      network,
      accountToSign: signWith,
    });
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return signedTransaction;
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign

const userSignedTransaction = userSignTransaction(xdr, "TESTNET");

const SERVER_URL = "https://horizon-testnet.stellar.org";

const server = new StellarSdk.Server(SERVER_URL);

const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
  userSignedTransaction,
  SERVER_URL
);

const response = await server.submitTransaction(transactionToSubmit);
```
