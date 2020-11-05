import React, { useState } from "react";
import buffer from "buffer";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { get } from "lodash";
import styled from "styled-components";
import BigNumber from "bignumber.js";

import {
  truncatedPublicKey,
  getTransactionInfo,
  stroopToXlm,
} from "helpers/stellar";

import { rejectTransaction, signTransaction } from "popup/ducks/access";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { OPERATION_TYPES } from "constants/operationTypes";
import {
  NETWORK_NAME,
  NETWORK_PASSPHRASE,
  OTHER_NETWORK_NAME,
} from "@shared/constants/stellar";

import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";

import { FirstTimeWarningMessage } from "popup/components/warningMessages/FirstTimeWarningMessage";
import { Header } from "popup/components/Header";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { WarningMessage } from "popup/components/WarningMessage";

const El = styled.div`
  padding: 1.5rem 1.875rem;
  box-sizing: border-box;
`;
const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
`;
const OperationsHeader = styled.h2`
  color: ${COLOR_PALETTE.primary};
  font-size: 1.375rem;
  margin: 0;
  padding: 0;
  padding-top: 2.25rem;
`;
const SubheaderEl = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary};
`;
const OperationBoxHeaderEl = styled.h4`
  color: ${COLOR_PALETTE.primary};
  font-size: 1.25rem;
  font-weight: ${FONT_WEIGHT.normal};
  margin: 0;
  padding: 0;
  padding-top: 1.875rem;
  padding-bottom: 0.625rem;
  padding-left: 0.43rem;

  strong {
    font-weight: ${FONT_WEIGHT.bold};
  }
`;
const OperationBoxEl = styled.div`
  text-align: left;
`;
const ListEl = styled.ul`
  width: 100%;
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  list-style-type: none;
  padding: 0;
  margin: 0;
  margin-top: 1rem;
  margin-bottom: 1.33em;

  li {
    display: flex;
    margin: 1.25rem 0;
    color: ${COLOR_PALETTE.secondaryText};

    div:first-child {
      padding-right: 0.75rem;
    }
  }

  strong {
    font-weight: ${FONT_WEIGHT.bold};
    color: ${COLOR_PALETTE.text};
  }
`;
const OperationsListEl = styled(ListEl)`
  padding-left: 1.25rem;

  li {
    div {
      width: 50%;

      &:first-child {
        padding: 0;
        color: ${COLOR_PALETTE.text};
      }
    }
  }
`;

const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding-top: 3rem;
  padding-bottom: 1.5rem;
`;
const RejectButtonEl = styled(Button)`
  background: ${COLOR_PALETTE.text};
  width: 9.68rem;
`;
const SubmitButtonEl = styled(SubmitButton)`
  width: 12.43rem;
`;

const NetworkMismatchWarning = () => (
  <>
    <WarningMessage subheader={`Freighter is currently on ${NETWORK_NAME}`}>
      <p>The transaction you’re trying to sign is on {OTHER_NETWORK_NAME}.</p>
      <p>Signing this transaction is not possible at the moment.</p>
    </WarningMessage>
    <ButtonContainerEl>
      <SubmitButtonEl size="small" onClick={() => window.close()}>
        Close
      </SubmitButtonEl>
    </ButtonContainerEl>
  </>
);

export const SignTransaction = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { transaction, domain, isDomainListedAllowed } = getTransactionInfo(
    location.search,
  );

  const {
    _fee,
    _operations,
    _memo,
    _networkPassphrase,
    _sequence,
    _source,
  } = transaction;
  const operationText = _operations.length > 1 ? "Operations:" : "Operation:";
  const memo = buffer.Buffer.from(get(_memo, "_value.data", [])).toString(
    "utf-8",
  );

  const [isConfirming, setIsConfirming] = useState(false);

  if (_networkPassphrase !== NETWORK_PASSPHRASE) {
    return <NetworkMismatchWarning />;
  }

  const rejectAndClose = () => {
    dispatch(rejectTransaction());
    window.close();
  };

  const signAndClose = async () => {
    setIsConfirming(true);
    await dispatch(signTransaction({ transaction }));
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
    type: keyof typeof OPERATION_TYPES;
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
      <div>{TransactionInfoKey}:</div>
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
          <OperationBoxEl>
            <OperationBoxHeaderEl>
              {operationIndex}. {OPERATION_TYPES[type]}
            </OperationBoxHeaderEl>
            <OperationsListEl>
              {destination ? (
                <KeyValueList
                  TransactionInfoKey="Destination"
                  TransactionInfoValue={truncatedPublicKey(destination)}
                />
              ) : null}

              {asset ? (
                <KeyValueList
                  TransactionInfoKey="Asset"
                  TransactionInfoValue={`${asset.code}`}
                />
              ) : null}

              {amount ? (
                <KeyValueList
                  TransactionInfoKey="Amount"
                  TransactionInfoValue={`${new BigNumber(amount).toFormat(2)} ${
                    asset.code
                  }`}
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
            </OperationsListEl>
          </OperationBoxEl>
        );
      },
    );

  return (
    <>
      <Header />
      <El>
        <HeaderEl>Confirm Transaction</HeaderEl>
        {!isDomainListedAllowed ? <FirstTimeWarningMessage /> : null}
        <PunycodedDomain domain={domain} />
        <SubheaderEl>
          This website is requesting a signature on the following transaction:
        </SubheaderEl>
        <ListEl>
          <li>
            <div>
              <strong>Source account:</strong>
            </div>
            <div>{truncatedPublicKey(_source)}</div>
          </li>
          {_fee ? (
            <li>
              <div>
                <strong>Base fee:</strong>
              </div>
              <div> {stroopToXlm(_fee)} XLM</div>
            </li>
          ) : null}
          {memo ? (
            <li>
              <div>
                <strong>Memo:</strong>
              </div>
              <div> {memo} (MEMO_TEXT)</div>
            </li>
          ) : null}
          {_sequence ? (
            <li>
              <div>
                <strong>Transaction sequence number:</strong>
              </div>
              <div> {_sequence}</div>
            </li>
          ) : null}
        </ListEl>
        <OperationsHeader>
          {_operations.length} {operationText}
        </OperationsHeader>
        <Operations />
        <ButtonContainerEl>
          <RejectButtonEl size="small" onClick={() => rejectAndClose()}>
            Reject
          </RejectButtonEl>
          <SubmitButtonEl
            isSubmitting={isConfirming}
            size="small"
            onClick={() => signAndClose()}
          >
            Confirm Transaction
          </SubmitButtonEl>
        </ButtonContainerEl>
      </El>
    </>
  );
};
