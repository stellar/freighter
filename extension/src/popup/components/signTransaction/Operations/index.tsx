import React from "react";

import {
  CLAIM_PREDICATES,
  FLAG_TYPES,
  OPERATION_TYPES,
  TRANSACTION_WARNING,
} from "constants/transaction";

import { FlaggedKeys } from "types/transactions";

import { truncatedPoolId, truncatedPublicKey } from "helpers/stellar";

import { IconWithLabel } from "popup/basics/TransactionList";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import IconExclamation from "popup/assets/icon-exclamation.svg";

import "./styles.scss";

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
  liquidityPoolId: string;
  lowThreshold: number;
  masterWeight: number;
  medThreshold: number;
  maxAmountA: number;
  maxAmountB: number;
  maxPrice: number;
  minAmountA: number;
  minAmountB: number;
  minPrice: number;
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

const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <div className="Operations--pair">
    <div>
      {operationKey}
      {operationKey ? ":" : null}
    </div>
    <div>{operationValue}</div>
  </div>
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
    operationValue={<KeyIdenticon publicKey={operationValue} isSmall />}
  />
);

const PathList = ({ paths }: { paths: [Path] }) => (
  <>
    <div>Paths: </div>
    {paths.map(({ code, issuer }, i) => (
      <div className="Operations--list--item" key={`${code} ${i + 1}`}>
        <div>#{i + 1}</div>
        <KeyValueList operationKey="Asset Code" operationValue={code} />
        {issuer ? (
          <KeyValueList
            operationKey="Issuer"
            operationValue={<KeyIdenticon publicKey={issuer} isSmall />}
          />
        ) : null}
      </div>
    ))}
  </>
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
        <IconWithLabel
          isHighAlert={isDestMalicious}
          alt="exclamation icon"
          icon={IconExclamation}
        >
          {isDestMalicious ? "Malicious" : "Unsafe"} account
        </IconWithLabel>
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
        <IconWithLabel
          isHighAlert
          alt="exclamation icon"
          icon={IconExclamation}
        >
          Memo required
        </IconWithLabel>
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
  <div className="Operations">
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
          liquidityPoolId,
          lowThreshold,
          masterWeight,
          maxAmountA,
          maxAmountB,
          maxPrice,
          minAmountA,
          minAmountB,
          minPrice,
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
          <div className="Operations--wrapper" key={operationIndex}>
            <div className="Operations--header">
              <strong>
                {operationIndex}. {OPERATION_TYPES[type] || type}
              </strong>
            </div>
            <div className="Operations--item">
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
                    <div
                      className="Operations--list--item"
                      key={`${_destination}${index}`}
                    >
                      {/* eslint-enable */}
                      <div>Claimant {index + 1}</div>
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

              {liquidityPoolId ? (
                <KeyValueList
                  operationKey="Liquidity Pool ID"
                  operationValue={truncatedPoolId(liquidityPoolId)}
                />
              ) : null}

              {maxAmountA ? (
                <KeyValueList
                  operationKey="Max Amount A"
                  operationValue={maxAmountA}
                />
              ) : null}

              {maxAmountB ? (
                <KeyValueList
                  operationKey="Max Amount B"
                  operationValue={maxAmountB}
                />
              ) : null}
              {maxPrice ? (
                <KeyValueList
                  operationKey="Max Price"
                  operationValue={maxPrice}
                />
              ) : null}
              {minAmountA ? (
                <KeyValueList
                  operationKey="Min Amount A"
                  operationValue={minAmountA}
                />
              ) : null}

              {minAmountB ? (
                <KeyValueList
                  operationKey="min Amount B"
                  operationValue={minAmountB}
                />
              ) : null}
              {minPrice ? (
                <KeyValueList
                  operationKey="Min Price"
                  operationValue={minPrice}
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
                <KeyValueList
                  key={k}
                  operationKey={k}
                  operationValue={typeof v === "string" ? v : JSON.stringify(v)}
                />
              ))}
            </div>
          </div>
        );
      },
    )}
  </div>
);
