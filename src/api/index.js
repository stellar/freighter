// import bcrypt from "bcryptjs";
import StellarSdk, { Transaction } from "stellar-sdk";
import StellarHDWallet from "stellar-hd-wallet";

import { EXTENSION_ID, SERVER_URL } from "../statics";

const server = new StellarSdk.Server(SERVER_URL);

// const buildTransaction = async ({ destinationId, assetType, amount, memo }) => {
//   try {
//     await server.loadAccount(destinationId);
//   } catch (e) {
//     if (e instanceof StellarSdk.NotFoundError) {
//       throw new Error("The destination account does not exist!");
//     }
//     return e;
//   }

//   let sourceAccount;

//   try {
//     sourceAccount = await server.loadAccount(sourceKeys.publicKey());
//   } catch (e) {
//     throw new Error("Unable to load source account!");
//   }

//   const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
//     fee: StellarSdk.BASE_FEE,
//     networkPassphrase: StellarSdk.Newtworks.TESTNET,
//   })
//     .addOperation(
//       StellarSdk.Operation.payment({
//         destination: destinationId,
//         asset: assetType,
//         amount,
//       }),
//     )
//     .addMemo(StellarSdk.Memo.text(memo))
//     .setTimeout(transactionTimeout)
//     .build();

//   return transaction;
// };

// export const signTransaction = async (transaction) => {
//   Transaction.sign(sourceKeys);

//   let signedTransaction;

//   try {
//     signedTransaction = await server.submitTransaction(transaction);
//   } catch (e) {
//     console.error("Something went wrong!", e);
//   }

//   return signedTransaction;
// };

const injectApi = () => {
  const pair = StellarSdk.Keypair.random();
  const seed = pair.secret();

  StellarHDWallet.fromSeed(seed);
  const mnemonic = StellarHDWallet.generateMnemonic();

  return {
    mnemonic,
    seed,
    pair,
  };
};

window.lyra = injectApi();
