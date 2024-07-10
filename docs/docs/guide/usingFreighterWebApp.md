---
id: usingFreighterWebApp
title: Using Freighter in a web app
---

We now have an extension installed on our machine and a library to interact with it. This library will provide you methods to send and receive data from a user's extension in your website or application.

### Importing

First import the whole library in an ES2023 application

```javascript
import freighterApi from "@stellar/freighter-api";
```

or import just the modules you require:

```javascript
import {
  isConnected,
  getAddress,
  signAuthEntry,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";
```

Now let's dig into what functionality is available to you:

### isConnected

#### `isConnected() -> <Promise<{ isConnected: boolean } | { error: string; }>>`

This function is useful for determining if a user in your application has Freighter installed.

```typescript
import { isConnected } from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if ("isConnected" in isAppConnected && isAppConnected.isConnected) {
  alert("User has Freighter!");
}
```

### isAllowed

#### `isAllowed() -> <Promise<{ isAllowed: boolean } | { error: string; }>>`

This function is useful for determining if a user has previously authorized your app to receive data from Freighter.

```javascript
import { isAllowed } from "@stellar/freighter-api";

const isAppAllowed = await isAllowed();

if ("isAllowed" in isAppAllowed && isAppAllowed.isAllowed) {
  alert("User has allowed your app!");
}
```

### setAllowed

#### `setAllowed() -> <Promise<{ isAllowed: boolean } | { error: string; }>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive user data. If and when the user accepts, this function will resolve with a boolean of `true` indicating the app is now on the extension's "Allow list". This means the extension can immediately provide user data without any user action.

```javascript
import { setAllowed } from "@stellar/freighter-api";

const isAppAllowed = await setAllowed();

if ("isAllowed" in isAppAllowed && isAppAllowed.isAllowed) {
  alert("Successfully added the app to Freighter's Allow List");
}
```

### requestAccess

#### `requestAccess() -> <Promise<{ address: string }  | { error: string; }>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive the user's public key. If and when the user accepts, this function will resolve with an object containing the public key. Otherwise, it will provide an error.

If the user has authorized your application previously, it will be on the extension's "Allow list", meaning the extension can immediately provide the public key without any user action.

```javascript
import {
  isConnected,
  requestAccess,
  signAuthEntry,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if ("isConnected" in isAppConnected && isAppConnected.isConnected) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  const accessObj = await requestAccess();

  if ("error" in accessObj) {
    return accessObj.error;
  } else {
    return accessObj.address;
  }
};

const result = retrievePublicKey();
```

### getAddress

#### `getAddress() -> <Promise<{ address: string } | { error: string; }>>`

This is a more lightweight version of `requestAccess` above.

If the user has authorized your application previously and Freighter is connected, Freighter will simply return the public key. If either one of the above is not true, it will return an empty string.

```javascript
import { getAddress } from "@stellar/freighter-api";

const retrievePublicKey = async () => {
  const addressObj = await getAddress();

  if ("error" in addressObj) {
    return addressObj.error;
  } else {
    return addressObj.address;
  }
};

const result = retrievePublicKey();
```

### getNetwork

#### `getNetwork() -> <Promise<{ network: string; networkPassphrase: string } | { error: string; }>>`

This function is useful for determining what network the user has configured Freighter to use. Freighter will be configured to either `PUBLIC`, `TESTNET`, `FUTURENET`, or `STANDALONE` (for custom networks).

```javascript
import {
  isConnected,
  getNetwork,
  signAuthEntry,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if ("isConnected" in isAppConnected && isAppConnected.isConnected) {
  alert("User has Freighter!");
}

const retrieveNetwork = async () => {
  const networkObj = await getNetwork();

  if ("error" in networkObj) {
    return networkObj.error;
  } else {
    return {
      network: networkObj.network,
      networkPassphrase: networkObj.networkPassphrase,
    };
  }
};

const result = retrieveNetwork();
```

### signTransaction

#### `signTransaction(xdr: string, opts?: { network?: string, networkPassphrase?: string, address?: string }) -> <Promise<{ signedTxXdr: string; signerAddress: string; } | { error: string; }>>`

This function accepts a transaction XDR string as the first parameter, which it will decode, sign as the user, and then return the signed transaction to your application.

The user will need to provide their password if the extension does not currently have their private key. Once the user has provided their password, the extension will have access to the user private key for 5 minutes. The user must then review the transaction details and accept within those 5 minutes for the transaction to be signed.

_NOTE:_ The user must provide a valid transaction XDR string for the extension to properly sign.

The second parameter is an optional `opts` object where you can specify the network you are intending the transaction to be signed on. This `network` name maps to the Networks enum in js-stellar-sdk. Freighter will use this network name to derive the network passphrase from js-stellar-sdk.

If the passphrase you need can't be found in js-stellar-sdk, you can simply pass a custom `networkPassphrase` for Freighter to use. In the event both are passed, Freighter will default to using `network` to derive the passphrase from js-stellar-sdk and ignore `networkPassphrase`.

These 2 configurations are useful in the case that the user's Freighter is configured to the wrong network. Freighter will be able to throw a blocking error message communicating that you intended this transaction to be signed on a different network.

You can also use this `opts` to specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

### signAuthEntry

#### `signAuthEntry(authEntryXdr: string, opts: { address: string }) -> <Promise<{ signedAuthEntry: string; signerAddress: string } | { error: string; }>>`

This function accepts an [authorization entry preimage](https://github.com/stellar/js-stellar-base/blob/a9567e5843760bfb6a8b786592046aee4c9d38b2/types/next.d.ts#L6895) as the first parameter and it returns a signed hash of the same authorization entry, which can be added to the [address credentials](https://github.com/stellar/js-stellar-base/blob/a9567e5843760bfb6a8b786592046aee4c9d38b2/types/next.d.ts#L6614) of the same entry. The [`authorizeEntry` helper](https://github.com/stellar/js-stellar-base/blob/e3d6fc3351e7d242b374c7c6057668366364a279/src/auth.js#L97) in stellar base is a good example of how this works.

The second parameter is an optional `opts` object where you can specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

### signMessage

#### `signMessage(message: string, opts: { address: string }) -> <Promise<{ signedMessage: string; signerAddress: string; } | { error: string; }>>`

This function accepts a base64 encoded blob of arbitrary data as the first parameter, which it will decode, sign as the user, and return a Buffer of the signed contents.

The second parameter is an optional `opts` object where you can specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

```javascript
import {
  isConnected,
  getPublicKey,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if ("isConnected" in isAppConnected && isAppConnected.isConnected) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  const accessObj = await requestAccess();

  if ("error" in accessObj) {
    throw new Error(accessObj.error.message);
  } else {
    return accessObj.address;
  }
};

const retrievedPublicKey = retrievePublicKey();

const userSignTransaction = async (
  xdr: string,
  network: string,
  signWith: string
) => {
  const signedTransactionRes = await signTransaction(xdr, {
    network,
    address: signWith,
  });

  if ("error" in signedTransactionRes) {
    throw new Error(signedTransactionRes.error.message);
  } else {
    return signedTransactionRes.signedTxXdr;
  }
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign
const userSignedTransaction = userSignTransaction(xdr, "TESTNET");
```

freighter-api will return a signed transaction xdr. Below is an example of how you might submit this signed transaction to Horizon using `stellar-sdk` (https://github.com/stellar/js-stellar-sdk):

```javascript
import { Server, TransactionBuilder } from "stellar-sdk";

const userSignTransaction = async (
  xdr: string,
  network: string,
  signWith: string
) => {
  const signedTransactionRes = await signTransaction(xdr, {
    network,
    address: signWith,
  });

  if ("error" in signedTransactionRes) {
    throw new Error(signedTransactionRes.error.message);
  } else {
    return signedTransactionRes.signedTxXdr;
  }
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign

const userSignedTransaction = userSignTransaction(xdr, "TESTNET");

const SERVER_URL = "https://horizon-testnet.stellar.org";

const server = new Server(SERVER_URL);

const transactionToSubmit = TransactionBuilder.fromXDR(
  userSignedTransaction,
  SERVER_URL
);

const response = await server.submitTransaction(transactionToSubmit);
```
