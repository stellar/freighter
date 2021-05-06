import React from "react";
import styled from "styled-components";

import {
  CLAIM_PREDICATES,
  FLAG_TYPES,
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

type FLAGS = { [key in FLAG_TYPES]: boolean };

interface TransactionInfoResponse {
  account: string;
  amount: string;
  asset: { code: string };
  balanceId: string;
  buyAmount: string;
  buying: { code: string };
  claimants: Array<Claimant>;
  clearFlags: number;
  destination: string;
  destAsset: { code: string };
  flags: FLAGS;
  from: string;
  highThreshold: number;
  inflationDest: string;
  lowThreshold: number;
  masterWeight: number;
  medThreshold: number;
  offerId: number;
  path: [Path];
  price: string;
  seller: string;
  selling: { code: string };
  sendAsset: { code: string };
  setFlags: number;
  signer: {
    ed25519PublicKey?: string;
    sha256Hash?: { data: Buffer };
    preAuthTx?: { data: Buffer };
    weight: number;
  };
  source: string;
  sponsoredId: string;
  trustor: string;
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

const PathListItem = styled.li`
  display: block;
  flex-direction: column;
`;

const OperationsListEl = styled(TransactionList)`
  font-size: 0.8rem;
  padding-left: 1.25rem;

  li {
    & > div {
      width: 50%;

      &:first-child {
        color: ${COLOR_PALETTE.text};
        overflow: hidden;
        padding: 0;
        text-overflow: ellipsis;
      }
    }
  }

  ${PathListItem} {
    align-items: start;
    margin-bottom: 1rem;
  }
`;

const OperationKey = styled.div`
  text-transform: capitalize;
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
    <OperationKey>
      {operationKey}
      {operationKey ? ":" : null}
    </OperationKey>
    <div>{operationValue}</div>
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

const FlagList = ({ flags }: { flags: FLAGS }) => (
  <>
    {Object.entries(flags).map(([flag, value]) => (
      <div key={flag}>
        <KeyValueList
          operationKey={FLAG_TYPES[flag as keyof typeof FLAG_TYPES]}
          operationValue={value.toString()}
        />
      </div>
    ))}
  </>
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
          balanceId,
          buyAmount,
          buying,
          claimants,
          clearFlags,
          destination,
          destAsset,
          flags,
          from,
          highThreshold,
          inflationDest,
          lowThreshold,
          masterWeight,
          medThreshold,
          offerId,
          path,
          price,
          seller,
          selling,
          sendAsset,
          setFlags,
          signer,
          source,
          sponsoredId,
          trustor,
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
              {account ? (
                <KeyValueWithPublicKey
                  operationKey="Account"
                  operationValue={account}
                />
              ) : null}

              {amount ? (
                <KeyValueList
                  operationKey="Amount"
                  operationValue={`${amount}`}
                />
              ) : null}

              {asset ? (
                <KeyValueList
                  operationKey="Asset"
                  operationValue={`${asset.code}`}
                />
              ) : null}

              {balanceId ? (
                <KeyValueList
                  operationKey="Balance Id"
                  operationValue={balanceId}
                />
              ) : null}

              {buyAmount ? (
                <KeyValueList
                  operationKey="Amount"
                  operationValue={buyAmount}
                />
              ) : null}

              {buying ? (
                <KeyValueList
                  operationKey="Buying"
                  operationValue={buying.code}
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

              {clearFlags ? (
                <KeyValueList
                  operationKey="Clear Flags"
                  operationValue={AuthorizationMap[clearFlags]}
                />
              ) : null}

              {destAsset ? (
                <KeyValueList
                  operationKey="Destination Asset"
                  operationValue={`${destAsset.code}`}
                />
              ) : null}

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

              {flags && Object.keys(flags).length ? (
                <FlagList flags={flags} />
              ) : null}

              {from ? (
                <KeyValueWithPublicKey
                  operationKey="From"
                  operationValue={from}
                />
              ) : null}

              {highThreshold ? (
                <KeyValueList
                  operationKey="High Threshold"
                  operationValue={highThreshold}
                />
              ) : null}

              {inflationDest ? (
                <KeyValueWithPublicKey
                  operationKey="Inflation Destination"
                  operationValue={inflationDest}
                />
              ) : null}

              {lowThreshold ? (
                <KeyValueList
                  operationKey="Low Threshold"
                  operationValue={lowThreshold}
                />
              ) : null}

              {masterWeight ? (
                <KeyValueList
                  operationKey="Master Weight"
                  operationValue={masterWeight}
                />
              ) : null}

              {medThreshold ? (
                <KeyValueList
                  operationKey="Medium Threshold"
                  operationValue={medThreshold}
                />
              ) : null}

              {offerId ? (
                <KeyValueList
                  operationKey="Offer Id"
                  operationValue={offerId}
                />
              ) : null}

              {path?.length ? <PathList paths={path} /> : null}

              {price ? (
                <KeyValueList operationKey="Price" operationValue={price} />
              ) : null}

              {sendAsset ? (
                <KeyValueList
                  operationKey="Sending Asset"
                  operationValue={`${sendAsset.code}`}
                />
              ) : null}

              {seller ? (
                <KeyValueWithPublicKey
                  operationKey="Seller"
                  operationValue={seller}
                />
              ) : null}

              {selling ? (
                <KeyValueList
                  operationKey="Selling"
                  operationValue={selling.code}
                />
              ) : null}

              {setFlags ? (
                <KeyValueList
                  operationKey="Set Flags"
                  operationValue={AuthorizationMap[setFlags]}
                />
              ) : null}

              {signer?.ed25519PublicKey ? (
                <KeyValueWithPublicKey
                  operationKey="Signer"
                  operationValue={signer.ed25519PublicKey}
                />
              ) : null}
              {signer?.sha256Hash ? (
                <KeyValueList
                  operationKey="Signer"
                  operationValue={formattedBuffer(signer?.sha256Hash?.data)}
                />
              ) : null}
              {signer?.preAuthTx ? (
                <KeyValueList
                  operationKey="Signer"
                  operationValue={formattedBuffer(signer.preAuthTx.data)}
                />
              ) : null}
              {signer?.weight ? (
                <KeyValueList
                  operationKey="Weight"
                  operationValue={signer.weight}
                />
              ) : null}

              {source ? (
                <KeyValueWithPublicKey
                  operationKey="Source"
                  operationValue={source}
                />
              ) : null}

              {sponsoredId ? (
                <KeyValueWithPublicKey
                  operationKey="Sponsored Id"
                  operationValue={sponsoredId}
                />
              ) : null}

              {trustor ? (
                <KeyValueWithPublicKey
                  operationKey="Trustor"
                  operationValue={trustor}
                />
              ) : null}

              {Object.entries(rest).map(([k, v]) => (
                <div key={k}>
                  <KeyValueList
                    key={k}
                    operationKey={k}
                    operationValue={
                      typeof v === "string" ? v : JSON.stringify(v)
                    }
                  />
                </div>
              ))}
            </OperationsListEl>
          </OperationBoxEl>
        );
      },
    )}
  </>
);
