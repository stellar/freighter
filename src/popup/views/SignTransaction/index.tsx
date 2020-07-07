import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import styled from "styled-components";

import { operationTypes } from "statics";

import { rejectAccess, signTransaction } from "api/internal";

import { truncatedPublicKey } from "helpers";

import { publicKeySelector } from "popup/ducks/authServices";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/styles";
import { Button, BackButton, FormSubmitButton } from "popup/basics";

const El = styled.div`
  padding: 2.25rem 2.5rem;
  box-sizing: border-box;
`;
const Header = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
`;
const Subheader = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary}};
`;
const OperationBoxHeader = styled.h4`
  color: ${COLOR_PALETTE.primary}};
  font-size: 1.4rem;
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
  margin-top: 2.5rem;

  strong {
    font-weight: ${FONT_WEIGHT.bold};
  }
`;
const OperationBox = styled.div`
  text-align: left;
`;
const ListEl = styled.ul`
  max-width: 300px;
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  list-style-type: none;
  padding: 0;
  padding-left: 1.5rem;
  margin: 0;
  margin-top: 2rem;
  margin-bottom: 1.33em;

  li {
    display: flex;
    justify-content: space-between;
    margin: 1.35rem 0;
    color: ${COLOR_PALETTE.secondaryText}};

    div {
      width: 50%;
    }
  }

  strong {
    font-weight: ${FONT_WEIGHT.bold};
    color: ${COLOR_PALETTE.text}};
  }
`;
const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 3rem 1.25rem;
`;
const RejectButton = styled(Button)`
  background: ${COLOR_PALETTE.text};
`;

export const SignTransaction = () => {
  const location = useLocation();
  const decodedTransactionInfo = atob(location.search.replace("?", ""));
  const transactionInfo = decodedTransactionInfo
    ? JSON.parse(decodedTransactionInfo)
    : {};
  const {
    tab: { title },
    transaction,
  } = transactionInfo;

  const { _fee, _operations } = transaction;
  const publicKey = useSelector(publicKeySelector);
  const [isConfirming, setIsConfirming] = useState(false);

  const rejectAndClose = async () => {
    await rejectAccess();
    window.close();
  };

  const signAndClose = async () => {
    setIsConfirming(true);
    await signTransaction({ transaction });
    window.close();
  };

  interface TransactionInfoResponse {
    amount: string;
    destination: string;
    asset: { code: string };
    signer: {
      ed25519PublicKey: string;
      weight: number;
    };
    type: keyof typeof operationTypes;
    buying: { code: string };
    selling: { code: string };
    buyAmount: string;
    price: string;
  }

  const KeyValueList = ({
    TransactionInfoKey,
    TransactionInfoValue,
  }: {
    TransactionInfoKey: string;
    TransactionInfoValue: string | number;
  }) => (
    <li>
      <div>
        <strong>{TransactionInfoKey}</strong>
      </div>
      <div>{TransactionInfoValue}</div>
    </li>
  );

  const Operations = () =>
    _operations.map(
      (
        {
          amount,
          destination,
          asset,
          signer,
          type,
          buying,
          selling,
          buyAmount,
          price,
        }: TransactionInfoResponse,
        i: number,
      ) => {
        const operationIndex = i + 1;

        return (
          <OperationBox>
            <OperationBoxHeader>
              Operation {operationIndex} <strong>{operationTypes[type]}</strong>
            </OperationBoxHeader>
            <ListEl>
              {amount ? (
                <KeyValueList
                  TransactionInfoKey="Amount"
                  TransactionInfoValue={`${new BigNumber(amount).toFormat(2)} ${
                    asset.code
                  }`}
                />
              ) : null}

              {destination ? (
                <KeyValueList
                  TransactionInfoKey="Destination"
                  TransactionInfoValue={truncatedPublicKey(destination)}
                />
              ) : null}

              {signer ? (
                <>
                  <KeyValueList
                    TransactionInfoKey="Signer"
                    TransactionInfoValue={truncatedPublicKey(
                      signer.ed25519PublicKey,
                    )}
                  />
                  <KeyValueList
                    TransactionInfoKey="Weight"
                    TransactionInfoValue={signer.weight}
                  />
                </>
              ) : null}

              {buying ? (
                <KeyValueList
                  TransactionInfoKey="Buying"
                  TransactionInfoValue={buying.code}
                />
              ) : null}

              {selling ? (
                <KeyValueList
                  TransactionInfoKey="Selling"
                  TransactionInfoValue={selling.code}
                />
              ) : null}

              {buyAmount ? (
                <KeyValueList
                  TransactionInfoKey="Amount"
                  TransactionInfoValue={new BigNumber(buyAmount).toFormat(2)}
                />
              ) : null}

              {price ? (
                <KeyValueList
                  TransactionInfoKey="Price"
                  TransactionInfoValue={price}
                />
              ) : null}
            </ListEl>
          </OperationBox>
        );
      },
    );

  return (
    <El>
      <BackButton onClick={() => window.location.replace("/")} />
      <Header>Confirm Transaction</Header>
      <Subheader>{title} is requesting a transaction</Subheader>
      <ListEl>
        <li>
          <div>
            <strong>Source Acc Key</strong>
          </div>
          <div>{truncatedPublicKey(publicKey)}</div>
        </li>
        {_fee ? (
          <li>
            <div>
              <strong>Base fee</strong>
            </div>
            <div> {_fee}</div>
          </li>
        ) : null}
      </ListEl>
      <Operations />
      <ButtonContainerEl>
        <RejectButton size="small" onClick={() => rejectAndClose()}>
          Reject
        </RejectButton>
        <FormSubmitButton
          buttonCTA="Confirm"
          isSubmitting={isConfirming}
          size="small"
          onClick={() => signAndClose()}
        />
      </ButtonContainerEl>
    </El>
  );
};
