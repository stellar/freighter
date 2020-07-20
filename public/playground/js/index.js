import {
  getPublicKey,
  signTransaction,
  isConnected,
} from "../../../src/contentScript/lyraApi";

document
  .querySelector("#lyra-isConnected")
  .addEventListener("click", async () => {
    let response = false;

    try {
      response = await isConnected();
    } catch (e) {
      console.error(e);
    }

    document.querySelector("#isConnected").value = response;
  });

document.querySelector("#lyra-connect").addEventListener("click", async () => {
  let response = "";

  try {
    response = await getPublicKey();
  } catch (e) {
    console.error(e);
  }
  const { publicKey, error } = response;

  const output = publicKey || error;

  document.querySelector("#publicKey").value = output;
});

document
  .querySelector("#lyra-submit-transaction")
  .addEventListener("click", async () => {
    const transactionXdr = document.querySelector("#transaction-xdr").value;

    let response = "";

    try {
      response = await signTransaction({
        transactionXdr,
      });
    } catch (e) {
      console.error(e);
    }

    const { transactionStatus, error } = response;

    const output = transactionStatus || error;
    document.querySelector("#transaction-status").value = JSON.stringify(
      output,
    );
  });
