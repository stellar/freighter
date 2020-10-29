---
id: usingFreighter
title: Using Freighter
---

We now have an extension installed on our machine and a library to interact with it. This library will provide you methods to send and receive data from a user's extension in your website or application.

### Importing

First import the whole library in a NodeJs application

```javascript
import freighterApi from "@stellar/freighter-api";
```

or import just the modules you require:

```javascript
import {
  isConnected,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";
```

Now let's dig into what functionality is available to you:

### isConnected

#### `isConnected() -> <boolean>`

This function is useful for determining if a user in your application has Freighter installed.

```javascript
import { isConnected } from "@stellar/freighter-api";

if (isConnected()) {
  alert("User has Freighter!");
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
} from "@stellar/freighter-api";

if (isConnected()) {
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

### signTransaction

#### `signTransaction(string) -> <Promise<string>>`

This function accepts an object containing an transaction XDR string, which it will decode, sign as the user, and then return the signed transaction to your application.

The user will need to provide their password if the extension does not currently have their private key. Once the user has provided their password, the extension will have access to the user private key for 5 minutes. The user must then review the transaction details and accept within those 5 minutes for the transaction to be signed.

_NOTE:_ Then user must provide a valid transaction XDR string for the extension to properly sign.

```javascript
import {
  isConnected,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";

if (isConnected()) {
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

const userSignTransaction = async (xdr: String) => {
  let signedTransaction = "";
  let error = "";

  try {
    res = await signTransaction(xdr);
  } catch (e) {
    error = e;
  }

  if (error) {
    return error;
  }

  return signedTransaction;
};

const userSignedTransaction = userSignTransaction();
```
