import React, { useState } from "react";
import buffer from "buffer";
import { useLocation } from "react-router-dom";
import { get } from "lodash";
import { useSelector } from "react-redux";
import styled from "styled-components";

import { publicKeySelector } from "popup/ducks/authServices";
import { operationTypes } from "statics";

import { rejectAccess, signTransaction } from "api";

const OperationBox = styled.div`
  background: #efefef;
  border: 1px solid #000;
  padding: 0.5em;
  text-align: left;
`;

const SignerBox = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SignTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
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
  const memo = buffer.Buffer.from(get(_memo, "_value.data", [])).toString(
    "utf-8",
  );

  const publicKey = useSelector(publicKeySelector);

  const rejectAndClose = async () => {
    setIsLoading(true);
    await rejectAccess();
    window.close();
  };

  const signAndClose = async () => {
    setIsLoading(true);
    await signTransaction({ transaction });
    window.close();
  };

  const Operations = () =>
    _operations.map(
      ({
        amount,
        destination,
        asset,
        signer,
        type,
      }: {
        amount: string;
        destination: string;
        asset: { code: string };
        signer: { ed25519PublicKey: string; weight: number };
        type: keyof typeof operationTypes;
      }) => (
        <OperationBox>
          <h4>{operationTypes[type]}</h4>
          {amount ? (
            <p>
              Amount: {amount} {asset.code}
            </p>
          ) : null}
          {destination ? <p>Destination: {destination}</p> : null}
          {signer ? (
            <>
              <SignerBox>Signer: {signer.ed25519PublicKey}</SignerBox>

              <SignerBox>Weight: {signer.weight}</SignerBox>
            </>
          ) : null}
        </OperationBox>
      ),
    );

  return (
    <>
      <h1>Confirm Transaction</h1>
      <img alt="favicon of site" src={`${url}/favico.png`} />

      <h3>{title} is requesting a transaction signature</h3>
      <h3>Transaction details</h3>
      <p>Source Account Key: {publicKey}</p>
      {fee ? <p>Base fee: {fee}</p> : null}
      <h3>{_operations.length} Operations:</h3>
      <Operations />
      <div>
        <p>memo: {memo}</p>
      </div>
      <button onClick={() => rejectAndClose()}>Reject</button>
      <button onClick={() => signAndClose()}>Confirm</button>
      {isLoading ? <h1>PROCESSING...</h1> : null}
    </>
  );
};

export default SignTransaction;
