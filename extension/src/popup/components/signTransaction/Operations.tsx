import React from "react";
import styled from "styled-components";

import {
  CLAIM_PREDICATES,
  OPERATION_TYPES,
  TRANSACTION_WARNING,
} from "constants/transaction";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { FlaggedKeys } from "types/transactions";

import { truncatedPublicKey } from "helpers/stellar";

import { IconWithLabel, TransactionList } from "popup/basics/TransactionList";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import IconExclamation from "popup/assets/icon-exclamation.svg";

interface Path {
  code: string;
  issuer?: string;
}

interface PredicateSwitch {
  name: keyof typeof CLAIM_PREDICATES;
  value: number;
}

type PredicateValue =
  | Array<Predicate>
  | { high: number; low: number; unsigned: boolean; _switch?: PredicateSwitch }
  | { _value: PredicateValue; _switch: PredicateSwitch };

interface Predicate {
  _switch: PredicateSwitch;
  _value?: PredicateValue;
}

interface Claimant {
  _destination: string;
  _predicate: Predicate;
}

interface TransactionInfoResponse {
  account: string;
  amount: string;
  asset: { code: string };
  buyAmount: string;
  buying: { code: string };
  claimants: Array<Claimant>;
  clearFlags: number;
  destination: string;
  destAsset: { code: string };
  highThreshold: number;
  inflationDest: string;
  lowThreshold: number;
  masterWeight: number;
  medThreshold: number;
  path: [Path];
  price: string;
  sendAsset: { code: string };
  selling: { code: string };
  setFlags: number;
  signer: {
    ed25519PublicKey?: string;
    sha256Hash?: { data: Buffer };
    preAuthTx?: { data: Buffer };
    weight: number;
  };
  source: string;
  sponsoredId: string;
  type: keyof typeof OPERATION_TYPES;
}

const OperationBoxEl = styled.div`
  overflow: hidden;
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
    & > div {
      width: 50%;

      &:first-child {
        padding: 0;
        color: ${COLOR_PALETTE.text};
      }
    }
  }
`;

const OperationKeyOrValue = styled.div`
  text-transform: capitalize;
`;

const PathListItem = styled.li`
  flex-direction: column;
`;

const SubHeaderEl = styled.h5`
  color: ${COLOR_PALETTE.primary};
  font-size: 1rem;
`;

const PathWrapperEl = styled.div`
  font-size: 0.75rem;
  flex-direction: column;
`;

const PathNumberEl = styled.h6`
  color: ${COLOR_PALETTE.primary};
  font-size: 0.875rem;
  margin: 0;
`;

const OpertionValueExtraEl = styled.div`
  margin-top: 0.5rem;
`;

const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <li>
    <OperationKeyOrValue>
      {operationKey}
      {operationKey ? ":" : null}
    </OperationKeyOrValue>
    <OperationKeyOrValue>{operationValue}</OperationKeyOrValue>
  </li>
);

const KeyValueWithPublicKey = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string;
}) => (
  <KeyValueList
    operationKey={operationKey}
    operationValue={<KeyIdenticon publicKey={operationValue} />}
  />
);

const PathList = ({ paths }: { paths: [Path] }) => (
  <PathListItem>
    <SubHeaderEl>Paths: </SubHeaderEl>
    {paths.map(({ code, issuer }, i) => (
      <PathWrapperEl key={`${code} ${i + 1}`}>
        <PathNumberEl>#{i + 1}</PathNumberEl>
        <ul>
          <KeyValueList operationKey="Asset Code" operationValue={code} />
          {issuer ? (
            <KeyValueList
              operationKey="Issuer"
              operationValue={truncatedPublicKey(issuer)}
            />
          ) : null}
        </ul>
      </PathWrapperEl>
    ))}
  </PathListItem>
);

const UnsafeMaliciousWarning = ({
  isDestUnsafe,
  isDestMalicious,
}: {
  isDestUnsafe: boolean;
  isDestMalicious: boolean;
}) =>
  isDestUnsafe || isDestMalicious ? (
    <KeyValueList
      operationKey=""
      operationValue={
        <OpertionValueExtraEl>
          <IconWithLabel
            isHighAlert={isDestMalicious}
            alt="exclamation icon"
            icon={IconExclamation}
          >
            {isDestMalicious ? "Malicious" : "Unsafe"} account
          </IconWithLabel>
        </OpertionValueExtraEl>
      }
    />
  ) : null;

const MemoRequiredWarning = ({
  isDestMemoRequired,
}: {
  isDestMemoRequired: boolean;
}) =>
  isDestMemoRequired ? (
    <KeyValueList
      operationKey=""
      operationValue={
        <OpertionValueExtraEl>
          <IconWithLabel
            isHighAlert
            alt="exclamation icon"
            icon={IconExclamation}
          >
            Memo required
          </IconWithLabel>
        </OpertionValueExtraEl>
      }
    />
  ) : null;

const DestinationWarning = ({
  destination,
  flaggedKeys,
  isMemoRequired,
}: {
  destination: string;
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
}) => {
  const flaggedTags = flaggedKeys[destination]?.tags || [];
  const isDestMalicious = flaggedTags.includes(TRANSACTION_WARNING.malicious);
  const isDestUnsafe = flaggedTags.includes(TRANSACTION_WARNING.unsafe);
  const isDestMemoRequired = flaggedTags.includes(
    TRANSACTION_WARNING.memoRequired,
  );

  return (
    <>
      <UnsafeMaliciousWarning
        isDestMalicious={isDestMalicious}
        isDestUnsafe={isDestUnsafe}
      />
      {isMemoRequired ? (
        <MemoRequiredWarning isDestMemoRequired={isDestMemoRequired} />
      ) : null}
    </>
  );
};

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
  flaggedKeys,
  isMemoRequired,
  operations = [] as Array<TransactionInfoResponse>,
}: {
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
  operations: Array<TransactionInfoResponse>;
}) => (
  <>
    {operations.map(
      (
        {
          account,
          amount,
          asset,
          buyAmount,
          buying,
          claimants,
          clearFlags,
          destination,
          destAsset,
          highThreshold,
          inflationDest,
          lowThreshold,
          masterWeight,
          medThreshold,
          path,
          price,
          selling,
          sendAsset,
          setFlags,
          signer,
          source,
          sponsoredId,
          type,
          ...rest
        },
        i: number,
      ) => {
        const operationIndex = i + 1;

        return (
          <OperationBoxEl key={operationIndex}>
            <OperationBoxHeaderEl>
              {operationIndex}. {OPERATION_TYPES[type] || type}
            </OperationBoxHeaderEl>
            <OperationsListEl>
              {destination ? (
                <>
                  <KeyValueWithPublicKey
                    operationKey="Destination"
                    operationValue={destination}
                  />
                  <DestinationWarning
                    destination={destination}
                    flaggedKeys={flaggedKeys}
                    isMemoRequired={isMemoRequired}
                  />
                </>
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
                  <KeyValueWithPublicKey
                    operationKey="Signer"
                    operationValue={signer.ed25519PublicKey}
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
                <KeyValueWithPublicKey
                  operationKey="Inflation Destination"
                  operationValue={inflationDest}
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
              {sponsoredId ? (
                <KeyValueWithPublicKey
                  operationKey="Sponsored Id"
                  operationValue={sponsoredId}
                />
              ) : null}
              {account ? (
                <KeyValueWithPublicKey
                  operationKey="Account"
                  operationValue={account}
                />
              ) : null}
              {source ? (
                <KeyValueWithPublicKey
                  operationKey="Source"
                  operationValue={source}
                />
              ) : null}
              {claimants && claimants.length
                ? claimants.map(({ _destination }, index) => (
                    /* eslint-disable react/no-array-index-key */
                    <div key={`${_destination}${index}`}>
                      {/* eslint-enable */}
                      <SubHeaderEl>Claimant {index + 1}</SubHeaderEl>
                      <KeyValueWithPublicKey
                        operationKey="Destination"
                        operationValue={_destination}
                      />
                      {/* TODO: Add appicable predicate UI */}
                    </div>
                  ))
                : null}
              {Object.entries(rest).map(([k, v]) =>
                React.isValidElement(v) ? (
                  <div key={k}>
                    <KeyValueList key={k} operationKey={k} operationValue={v} />
                  </div>
                ) : null,
              )}
            </OperationsListEl>
          </OperationBoxEl>
        );
      },
    )}
  </>
);
