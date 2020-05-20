import React, { useState } from "react";
import buffer from "buffer";
import { useLocation } from "react-router-dom";
import { get } from "lodash";
import { useSelector } from "react-redux";

import { publicKeySelector } from "ducks/authServices";

import { rejectAccess, signTransaction } from "api";

const SignTransaction = () => {
  const [password, setPassword] = useState("");
  const location = useLocation();
  const decodedTransactionInfo = atob(location.search.replace("?", ""));
  const transactionInfo = decodedTransactionInfo
    ? JSON.parse(decodedTransactionInfo)
    : {};
  const {
    tab: { url, title },
    transaction,
  } = transactionInfo;

  const { fee, _operations, _memo } = transaction;
  const { amount, destination, asset } = get(transaction, "_operations[0]");
  const memo = buffer.Buffer.from(get(_memo, "_value.data", [])).toString(
    "utf-8",
  );

  console.log(memo);
  const publicKey = useSelector(publicKeySelector);

  const rejectAndClose = async () => {
    await rejectAccess();
    window.close();
  };

  const signAndClose = async () => {
    await signTransaction({ password, transaction });
    window.close();
  };

  return (
    <>
      <h1>Confirm Transaction</h1>
      <img alt="favicon of site" src={`${url}/favico.png`} />

      <h3>{title} is requesting a transaction signature</h3>
      <h3>Transaction details</h3>
      <p>Source Account Key: {publicKey}</p>
      <p>Base fee: {fee}</p>
      <h3>{_operations.length} Operations:</h3>
      <div>
        <h3>Payment</h3>
        <p>destination: {destination}</p>
        <p>asset: {asset.code}</p>
        <p>
          amount: {amount} {asset.code}
        </p>
        <p>memo: {memo}</p>
      </div>
      <input type="text" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={() => rejectAndClose()}>Reject</button>
      <button onClick={() => signAndClose()}>Confirm</button>
    </>
  );
};

export default SignTransaction;
