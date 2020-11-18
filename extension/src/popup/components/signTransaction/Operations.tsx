import React from "react";
import styled from "styled-components";

import { truncatedPublicKey } from "helpers/stellar";

import { OPERATION_TYPES } from "constants/operationTypes";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { TransactionList } from "popup/basics/TransactionList";

interface Path {
  code: string;
  issuer?: string;
}

interface TransactionInfoResponse {
  amount: string;
  destination: string;
  asset: { code: string };
  destAsset: { code: string };
  sendAsset: { code: string };
  signer: {
    ed25519PublicKey?: string;
    sha256Hash?: { data: Buffer };
    preAuthTx?: { data: Buffer };
    weight: number;
  };
  path: [Path];
  type: keyof typeof OPERATION_TYPES;
  buying: { code: string };
  selling: { code: string };
  buyAmount: string;
  price: string;
  inflationDest: string;
  setFlags: number;
  clearFlags: number;
  masterWeight: number;
  lowThreshold: number;
  medThreshold: number;
  highThreshold: number;
}

const OperationBoxEl = styled.div`
  text-align: left;
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
const OperationsListEl = styled(TransactionList)`
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

const PathListItem = styled.li`
  flex-direction: column;
`;

const PathHeaderEl = styled.h5`
  color: ${COLOR_PALETTE.primary};
  font-size: 1rem;
`;

const PathWrapperEl = styled.div`
  font-size: 0.75rem;
  flex-direction: column;
  padding-left: 1rem;
`;

const PathNumberEl = styled.h6`
  color: ${COLOR_PALETTE.primary};
  font-size: 0.875rem;
  margin: 0;
`;

const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number;
}) => (
  <li>
    <div>{operationKey}:</div>
    <div>{operationValue}</div>
  </li>
);

const PathList = ({ paths }: { paths: [Path] }) => (
  <PathListItem>
    <PathHeaderEl>Paths: </PathHeaderEl>
    {paths.map(({ code, issuer }, i) => (
      <PathWrapperEl>
        <PathNumberEl>#{i + 1}</PathNumberEl>
        <KeyValueList operationKey="Asset Code" operationValue={code} />
        {issuer ? (
          <KeyValueList operationKey="Issuer" operationValue={issuer} />
        ) : null}
      </PathWrapperEl>
    ))}
  </PathListItem>
);

enum AuthorizationMap {
  "",
  "Authorization Required",
  "Authorization Revocable",
  "Authorization Required; Authorization Required",
  "Authorization Immutable",
  "Authorization Required; Authorization Immutable",
  "Authorization Revocable; Authorization Immutable",
  "Authorization Required; Authorization Required; Authorization Immutable",
}

const formattedBuffer = (data: Buffer) =>
  truncatedPublicKey(Buffer.from(data).toString("hex").toUpperCase());

export const Operations = ({
  operations,
}: {
  operations: [TransactionInfoResponse];
}) => (
  <>
    {operations.map(
      (
        {
          amount,
          destination,
          asset,
          destAsset,
          path,
          sendAsset,
          signer,
          type,
          buying,
          selling,
          buyAmount,
          price,
          inflationDest,
          setFlags,
          clearFlags,
          masterWeight,
          lowThreshold,
          medThreshold,
          highThreshold,
        }: TransactionInfoResponse,
        i: number,
      ) => {
        const operationIndex = i + 1;

        return (
          <OperationBoxEl key={operationIndex}>
            <OperationBoxHeaderEl>
              {operationIndex}. {OPERATION_TYPES[type]}
            </OperationBoxHeaderEl>
            <OperationsListEl>
              {destination ? (
                <KeyValueList
                  operationKey="Destination"
                  operationValue={truncatedPublicKey(destination)}
                />
              ) : null}

              {asset ? (
                <KeyValueList
                  operationKey="Asset"
                  operationValue={`${asset.code}`}
                />
              ) : null}

              {sendAsset ? (
                <KeyValueList
                  operationKey="Sending Asset"
                  operationValue={`${sendAsset.code}`}
                />
              ) : null}

              {path?.length ? <PathList paths={path} /> : null}

              {destAsset ? (
                <KeyValueList
                  operationKey="Destination Asset"
                  operationValue={`${destAsset.code}`}
                />
              ) : null}

              {amount ? (
                <KeyValueList
                  operationKey="Amount"
                  operationValue={`${amount}`}
                />
              ) : null}

              {signer?.ed25519PublicKey ? (
                <>
                  <KeyValueList
                    operationKey="Signer"
                    operationValue={truncatedPublicKey(signer.ed25519PublicKey)}
                  />
                  <KeyValueList
                    operationKey="Weight"
                    operationValue={signer.weight}
                  />
                </>
              ) : null}
              {signer?.sha256Hash ? (
                <>
                  <KeyValueList
                    operationKey="Signer"
                    operationValue={formattedBuffer(signer?.sha256Hash?.data)}
                  />
                  <KeyValueList
                    operationKey="Weight"
                    operationValue={signer.weight}
                  />
                </>
              ) : null}
              {signer?.preAuthTx ? (
                <>
                  <KeyValueList
                    operationKey="Signer"
                    operationValue={formattedBuffer(signer.preAuthTx.data)}
                  />
                  <KeyValueList
                    operationKey="Weight"
                    operationValue={signer.weight}
                  />
                </>
              ) : null}

              {buying ? (
                <KeyValueList
                  operationKey="Buying"
                  operationValue={buying.code}
                />
              ) : null}

              {selling ? (
                <KeyValueList
                  operationKey="Selling"
                  operationValue={selling.code}
                />
              ) : null}

              {buyAmount ? (
                <KeyValueList
                  operationKey="Amount"
                  operationValue={buyAmount}
                />
              ) : null}

              {price ? (
                <KeyValueList operationKey="Price" operationValue={price} />
              ) : null}
              {inflationDest ? (
                <KeyValueList
                  operationKey="Inflation Destination"
                  operationValue={truncatedPublicKey(inflationDest)}
                />
              ) : null}
              {setFlags ? (
                <KeyValueList
                  operationKey="Set Flags"
                  operationValue={AuthorizationMap[setFlags]}
                />
              ) : null}
              {clearFlags ? (
                <KeyValueList
                  operationKey="Clear Flags"
                  operationValue={AuthorizationMap[clearFlags]}
                />
              ) : null}
              {masterWeight ? (
                <KeyValueList
                  operationKey="Master Weight"
                  operationValue={masterWeight}
                />
              ) : null}
              {lowThreshold ? (
                <KeyValueList
                  operationKey="Low Threshold"
                  operationValue={lowThreshold}
                />
              ) : null}
              {medThreshold ? (
                <KeyValueList
                  operationKey="Medium Threshold"
                  operationValue={medThreshold}
                />
              ) : null}
              {highThreshold ? (
                <KeyValueList
                  operationKey="High Threshold"
                  operationValue={highThreshold}
                />
              ) : null}
            </OperationsListEl>
          </OperationBoxEl>
        );
      },
    )}
  </>
);
