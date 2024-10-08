---
id: developingForSoroban
title: Developing For Soroban
---

When interacting with a Soroban smart contract from a wallet, you will need to be able to encode human readable values into smart contract (SC) values and vice-versa.

For example, consider the common use case of sending a token payment. You would likely need to take in some values that a user configures in form fields and convert those into SC values to generate an XDR to simulate.

Another common use case is signing arbitrary XDR's sent from a dapp. In this scenario, you'll want to be dig into the invocations being called by a Soroban XDR and show them to the user in a way that they can understand what they're signing.

We'll go through each of these scenarios below.

### Encoding SC Values

In Freighter, we do this by utilizing helper methods in `@stellar/stellar-sdk`.

The below example is designed for a token transfer invocation, but this approach would work for any smart contract invocation.

```javascript

import {
  Address,
  Contract,
  TransactionBuilder,
  Memo,
  SorobanRpc,
  TransactionBuilder,
  XdrLargeInt,
} from "stellar-sdk";

/* For this example, we are assuming the token adheres to the interface documented in SEP-0041 */
const generateTransferXdr =
  (contractId, serverUrl, publicKey, destination, amount, fee, networkPassphrase, memo) => {
    // the contract id of the the token
    const contract = new Contract(contractId);

    const server = new SorobanRpc.Server(serverUrl);
    const sourceAccount = await server.getAccount(publicKey);
    const builder = new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase,
    });

    // these values would be entered by the user
    // we will use some helper methods to convert the addresses and the amount into SC vals
    const transferParams = [
      new Address(publicKey).toScVal(), // from
      new Address(destination).toScVal(), // to
      new XdrLargeInt("i128", amount).toI128(), // amount
    ];

    // call the `transfer` method with the listed params
    const transaction = builder
      .addOperation(contract.call("transfer", ...transferParams))
      .setTimeout(180);

    if (memo) {
      transaction.addMemo(Memo.text(memo));
    }

    transaction.build();

    // simulate the transaction
    const simulationTransaction = await server.simulateTransaction(
      transaction,
    );

    // and now assemble the transaction before signing
    const preparedTransaction = SorobanRpc.assembleTransaction(
      transaction,
      simulationTransaction,
    )
      .build()
      .toXDR();

    return {
      simulationTransaction,
      preparedTransaction,
    };
}
```

### Walking the invocation tree and parsing SC Values

If you have an XDR of a transaction containing an invocation, you may want to show the contents to the user. We'll walk the whole invocation tree to show the user all the invocations they are authorizing by signing. This is important as invocations can contain subinvocations that the user may not expect.

```javascript
const walkAndParse = (transactionXdr, networkPassphrase) => {
  const transaction = TransactionBuilder.fromXDR(
    transactionXdr,
    networkPassphrase
  );

  // for this simple example, let's just grab the first operation's first auth entry
  const op = transaction.operations[0];
  const firstAuthEntry = op.auth[0];

  const rootInvocation = firstAuthEntry.rootInvocation();

  /* This is a generic example of how to grab the function name, contract id, and the parameters of the
  invocation. This is useful for showing a user some details about the function that is actually going to 
  be called by the smart contract */
  const getInvocationArgs = (invocation) => {
    const fn = invocation.function();
    const _invocation = fn.contractFn();
    const contractId = StrKey.encodeContract(
      _invocation.contractAddress().contractId()
    );

    const fnName = _invocation.functionName().toString();
    const args = _invocation.args();

    return { fnName, contractId, args };
  };

  const invocations = [];

  /* We'll recursively walk the invocation tree to get all of the sub-invocations and pull out the 
  function name, contractId, and args, as shown above */

  walkInvocationTree(rootInvocation, (inv) => {
    const args = getInvocationArgs(inv);
    if (args) {
      invocations.push(args);
    }

    return null;
  });

  /* We now have some each information about the root invocation and its subinvocations, 
  but all the data is in SC val format, so it is still unreadable for users */

  // For simplicity, let's just grab the first invocation and show how to parse it
  const firstInvocation = invocations[0];
  const firstInvocationArgs = firstInvocation.args;

  /* Generally, we can just use `scValToNative` to decode a SC val into a usable JS data type
  but this may not work for all SC vals.
  For more information check the function scValByType in extension/src/popup/helpers/soroban.ts */
  const humanReadableArgs = firstInvocationArgs.map((a) => scValToNative(a));

  return humanReadableArgs;
};
```
