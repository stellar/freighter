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
  addToken,
} from "@stellar/freighter-api";
```

Now let's dig into what functionality is available to you:

### isConnected

#### `isConnected() -> <Promise<{ isConnected: boolean } & { error?: string; }>>`

This function is useful for determining if a user in your application has Freighter installed.

```typescript
import { isConnected } from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if (isAppConnected.isConnected) {
  alert("User has Freighter!");
}
```

### isAllowed

#### `isAllowed() -> <Promise<{ isAllowed: boolean } & { error?: string; }>>`

This function is useful for determining if a user has previously authorized your app to receive data from Freighter.

```typescript
import { isAllowed } from "@stellar/freighter-api";

const isAppAllowed = await isAllowed();

if (isAppAllowed.isAllowed) {
  alert("User has allowed your app!");
}
```

### setAllowed

#### `setAllowed() -> <Promise<{ isAllowed: boolean } & { error?: string; }>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive user data. If and when the user accepts, this function will resolve with a boolean of `true` indicating the app is now on the extension's "Allow list". This means the extension can immediately provide user data without any user action.

```typescript
import { setAllowed } from "@stellar/freighter-api";

const isAppAllowed = await setAllowed();

if (isAppAllowed.isAllowed) {
  alert("Successfully added the app to Freighter's Allow List");
}
```

### requestAccess

#### `requestAccess() -> <Promise<{ address: string }  & { error?: string; }>>`

If a user has never interacted with your app before, this function will prompt the user to provide your app privileges to receive the user's public key. If and when the user accepts, this function will resolve with an object containing the public key. Otherwise, it will provide an error.

If the user has authorized your application previously, it will be on the extension's "Allow list", meaning the extension can immediately provide the public key without any user action.

```typescript
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

  if (accessObj.error) {
    return accessObj.error;
  } else {
    return accessObj.address;
  }
};

const result = retrievePublicKey();
```

### getAddress

#### `getAddress() -> <Promise<{ address: string } & { error?: string; }>>`

This is a more lightweight version of `requestAccess` above.

If the user has authorized your application previously and Freighter is connected, Freighter will simply return the public key. If either one of the above is not true, it will return an empty string.

```typescript
import { getAddress } from "@stellar/freighter-api";

const retrievePublicKey = async () => {
  const addressObj = await getAddress();

  if (addressObj.error) {
    return addressObj.error;
  } else {
    return addressObj.address;
  }
};

const result = retrievePublicKey();
```

### getNetwork

#### `getNetwork() -> <Promise<{ network: string; networkPassphrase: string } & { error?: string; }>>`

This function is useful for determining what network the user has configured Freighter to use. Freighter will be configured to either `PUBLIC`, `TESTNET`, `FUTURENET`, or `STANDALONE` (for custom networks).

```typescript
import {
  isConnected,
  getNetwork,
  signAuthEntry,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if (isAppConnected.isConnected) {
  alert("User has Freighter!");
}

const retrieveNetwork = async () => {
  const networkObj = await getNetwork();

  if (networkObj.error) {
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

#### `signTransaction(xdr: string, opts?: { network?: string, networkPassphrase?: string, address?: string }) -> <Promise<{ signedTxXdr: string; signerAddress: string; } & { error?: string; }>>`

This function accepts a transaction XDR string as the first parameter, which it will decode, sign as the user, and then return the signed transaction to your application.

The user will need to provide their password if the extension does not currently have their private key. Once the user has provided their password, the extension will have access to the user private key for 5 minutes. The user must then review the transaction details and accept within those 5 minutes for the transaction to be signed.

_NOTE:_ The user must provide a valid transaction XDR string for the extension to properly sign.

The second parameter is an optional `opts` object where you can specify the network you are intending the transaction to be signed on. This `network` name maps to the Networks enum in js-stellar-sdk. Freighter will use this network name to derive the network passphrase from js-stellar-sdk.

If the passphrase you need can't be found in js-stellar-sdk, you can simply pass a custom `networkPassphrase` for Freighter to use. In the event both are passed, Freighter will default to using `network` to derive the passphrase from js-stellar-sdk and ignore `networkPassphrase`.

These 2 configurations are useful in the case that the user's Freighter is configured to the wrong network. Freighter will be able to throw a blocking error message communicating that you intended this transaction to be signed on a different network.

You can also use this `opts` to specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

### signAuthEntry

#### `signAuthEntry(authEntryXdr: string, opts: { address: string }) -> <Promise<{ signedAuthEntry: Buffer | null; signerAddress: string } & { error?: string; }>>`

This function accepts an [authorization entry preimage](https://github.com/stellar/js-stellar-base/blob/a9567e5843760bfb6a8b786592046aee4c9d38b2/types/next.d.ts#L6895) as the first parameter and it returns a signed hash of the same authorization entry, which can be added to the [address credentials](https://github.com/stellar/js-stellar-base/blob/a9567e5843760bfb6a8b786592046aee4c9d38b2/types/next.d.ts#L6614) of the same entry. The [`authorizeEntry` helper](https://github.com/stellar/js-stellar-base/blob/e3d6fc3351e7d242b374c7c6057668366364a279/src/auth.js#L97) in stellar base is a good example of how this works.

The second parameter is an optional `opts` object where you can specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

### signMessage

#### `signMessage(message: string, opts: { address: string }) -> <Promise<{ signedMessage: string | null; signerAddress: string; } & { error?: string; }>>`

This function accepts a string as the first parameter, which it will decode, sign as the user, and return a base64 encoded string of the signed contents.

The second parameter is an optional `opts` object where you can specify which account's signature you’re requesting. If Freighter has the public key requested, it will switch to that account. If not, it will alert the user that they do not have the requested account.

```typescript
import {
  isConnected,
  getPublicKey,
  signTransaction,
  signBlob,
} from "@stellar/freighter-api";

const isAppConnected = await isConnected();

if (isAppConnected.isConnected) {
  alert("User has Freighter!");
}

const retrievePublicKey = async () => {
  const accessObj = await requestAccess();

  if (accessObj.error) {
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

  if (signedTransactionRes.error) {
    throw new Error(signedTransactionRes.error.message);
  } else {
    return signedTransactionRes.signedTxXdr;
  }
};

const xdr = ""; // replace this with an xdr string of the transaction you want to sign
const userSignedTransaction = userSignTransaction(xdr, "TESTNET");
```

freighter-api will return a signed transaction xdr. Below is an example of how you might submit this signed transaction to Horizon using `stellar-sdk` (https://github.com/stellar/js-stellar-sdk):

```typescript
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

  if (signedTransactionRes.error) {
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

### addToken

#### `addToken({ contractId: string, networkPassphrase?: string }) -> <Promise<{ contractId: string } & { error?: string; }>>`

This function allows you to trigger an "add token" workflow to add a Soroban token to the user's Freighter wallet. It takes a contract ID as a required parameter and an optional network passphrase. If the network passphrase is omitted, it defaults to Pubnet's passphrase.

When called, Freighter will load the token details (symbol, name, decimals, and balance) from the contract and display them in a modal popup for user review. The user can then verify the token's legitimacy and approve adding it to their wallet. After approval, Freighter will track the token's balance and display it alongside other account balances.

```typescript
import { isConnected, addToken } from "@stellar/freighter-api";

const addSorobanToken = async () => {
  if (!(await isConnected())) {
    return;
  }

  const result = await addToken({
    contractId: "CC...ABCD", // The Soroban token contract ID
    networkPassphrase: "Test SDF Network ; September 2015", // Optional, defaults to Pubnet
  });

  if (result.error) {
    console.error(result.error);
    return;
  }

  console.log(
    `Successfully added token with contract ID: ${result.contractId}`
  );
};
```

The function returns a Promise that resolves to an object containing either:

- The contract ID of the added token on success
- An error message if the request fails or the user rejects it

### WatchWalletChanges

#### `WatchWalletChanges -> new WatchWalletChanges(timeout?: number)`

The class `WatchWalletChanges` provides methods to watch changes from Freighter. To use this class, first instantiate with an optional `timeout` param to determine how often you want to check for changes in the wallet. The default is `3000` ms.

##### `WatchWalletChanges.watch(callback: ({ address: string; network: string; networkPassphrase; string }) => void)`

The `watch()` method starts polling the extension for updates. By passing a callback into the method, you can access Freighter's `address`, `network`, and `networkPassphrase`. This method will only emit results when something has changed.

##### `WatchWalletChanges.stop()`

The `stop()` method will stop polling Freighter for changes:

```typescript
import { WatchWalletChanges } from "@stellar/freighter-api";

const Watcher = new WatchWalletChanges(1000);

Watcher.watch((watcherResults) => {
  document.querySelector("#address").innerHTML = watcherResults.address;
  document.querySelector("#network").innerHTML = watcherResults.network;
  document.querySelector("#networkPassphrase").innerHTML =
    watcherResults.networkPassphrase;
});

setTimeout(() => {
  // after 30 seconds, stop watching
  Watcher.stop();
}, 30000);
```
