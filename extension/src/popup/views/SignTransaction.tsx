import React, { useState } from "react";
import buffer from "buffer";
import { useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { get } from "lodash";
import styled from "styled-components";
import BigNumber from "bignumber.js";

import { truncatedPublicKey, getTransactionInfo } from "helpers/stellar";

import { OPERATION_TYPES } from "constants/operationTypes";

import { publicKeySelector } from "popup/ducks/authServices";
import { rejectTransaction, signTransaction } from "popup/ducks/access";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";

import { WarningMessage } from "popup/components/WarningMessage";
import { PunycodedDomain } from "popup/components/PunycodedDomain";

import WarningShieldIcon from "popup/assets/icon-warning-shield.svg";

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

export const SignTransaction = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { transaction, domain, isDomainListedAllowed } = getTransactionInfo(
    location.search,
  );

  const { _fee, _operations, _memo, _sequence } = transaction;
  const operationText = _operations.length > 1 ? "Operations:" : "Operation:";
  const memo = buffer.Buffer.from(get(_memo, "_value.data", [])).toString(
    "utf-8",
  );

  const publicKey = useSelector(publicKeySelector);

  const [isConfirming, setIsConfirming] = useState(false);

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
    <El>
      <HeaderEl>Confirm Transaction</HeaderEl>
      {!isDomainListedAllowed ? (
        <WarningMessage
          icon={WarningShieldIcon}
          subheader="This is the first time you interact with this domain in this browser"
        >
          <p>
            Double check the domain name, if you suspect of something, don't
            give it access.
          </p>
          <p>
            If you interacted with this domain before in this browser and are
            seeing this message, it may indicate a scam.
          </p>
        </WarningMessage>
      ) : null}
      <PunycodedDomain domain={domain} />
      <SubheaderEl>
        This website is requesting a signature to the follwing transaction:
      </SubheaderEl>
      <ListEl>
        <li>
          <div>
            <strong>Source account:</strong>
          </div>
          <div>{truncatedPublicKey(publicKey)}</div>
        </li>
        {_fee ? (
          <li>
            <div>
              <strong>Base fee:</strong>
            </div>
            <div> {_fee}</div>
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
          Sign Transaction
        </SubmitButtonEl>
      </ButtonContainerEl>
    </El>
  );
};
