document.querySelector("#lyra-connect").addEventListener("click", async () => {
  let response = "";

  try {
    response = await window.lyra.connect();
  } catch (e) {
    console.error(e);
  }
  const { publicKey, error } = response;

  let output = publicKey || error;

  document.querySelector("#publicKey").value = output;
});

document
  .querySelector("#lyra-submit-transaction")
  .addEventListener("click", async () => {
    const transactionXdr = document.querySelector("#transaction-xdr").value;

    let transactionStatus = "";

    try {
      transactionStatus = await window.lyra.submitTransaction({
        transactionXdr,
      });
    } catch (e) {
      console.error(e);
    }

    document.querySelector("#transaction-status").value = JSON.stringify(
      transactionStatus,
    );
  });
