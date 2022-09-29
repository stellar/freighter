import React from "react";
import { Icon, IconButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import {
  CLAIM_PREDICATES,
  FLAG_TYPES,
  OPERATION_TYPES,
  TRANSACTION_WARNING,
} from "constants/transaction";

import { FlaggedKeys } from "types/transactions";

import { truncatedPoolId, truncatedPublicKey } from "helpers/stellar";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

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
  asset: { code: string; issuer: string };
  balanceId: string;
  bumpTo: string;
  buyAmount: string;
  buying: { code: string };
  claimants: Array<Claimant>;
  clearFlags: number;
  destination: string;
  destAsset: { code: string };
  flags: FLAGS;
  footprint: any; // TODO: finalize schema
  function: any; // TODO: finalize schema
  from: string;
  highThreshold: number;
  inflationDest: string;
  limit: string;
  line: {
    code: string;
    issuer: string;
  };
  liquidityPoolId: string;
  lowThreshold: number;
  name: string;
  masterWeight: number;
  medThreshold: number;
  maxAmountA: number;
  maxAmountB: number;
  maxPrice: number;
  minAmountA: number;
  minAmountB: number;
  minPrice: number;
  offerId: number;
  parameters: any; // TODO: finalize schema
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
  value: {
    type: string;
    data: Buffer;
  };
}

const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <div className="Operations__pair">
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

const KeyValueWithScValue = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <div className="Operations__pair">
    <div>
      {operationKey}
      {operationKey ? ":" : null}
    </div>
    <SimpleBar className="Operations__scValue">
      <div>{operationValue}</div>
    </SimpleBar>
  </div>
);

const PathList = ({ paths }: { paths: [Path] }) => {
  const { t } = useTranslation();

  return (
    <>
      <div>{t("Paths")}: </div>
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
};

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
}) => {
  const { t } = useTranslation();

  return isDestUnsafe || isDestMalicious ? (
    <KeyValueList
      operationKey=""
      operationValue={
        <IconButton
          label={`${isDestMalicious ? t("Malicious") : t("Unsafe")} ${t(
            "account",
          )}`}
          altText="Error"
          icon={<Icon.Info />}
          variant={IconButton.variant.error}
        />
      }
    />
  ) : null;
};

const MemoRequiredWarning = ({
  isDestMemoRequired,
}: {
  isDestMemoRequired: boolean;
}) => {
  const { t } = useTranslation();

  return isDestMemoRequired ? (
    <KeyValueList
      operationKey=""
      operationValue={
        <IconButton
          label={t("Memo required")}
          altText="Error"
          icon={<Icon.Info />}
          variant={IconButton.variant.error}
        />
      }
    />
  ) : null;
};

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
}) => {
  const { t } = useTranslation();

  enum AuthorizationMap {
    "Authorization Required" = 1,
    "Authorization Revocable",
    "Authorization Required; Authorization Required",
    "Authorization Immutable",
    "Authorization Required; Authorization Immutable",
    "Authorization Revocable; Authorization Immutable",
    "Authorization Required; Authorization Required; Authorization Immutable",
  }

  /*
    Needed to translate enum strings:
    
    t("Authorization Required")
    t("Authorization Revocable")
    t("Authorization Required; Authorization Required")
    t("Authorization Immutable")
    t("Authorization Required; Authorization Immutable")
    t("Authorization Revocable; Authorization Immutable")
    t("Authorization Required; Authorization Required; Authorization Immutable")
  */

  return (
    <div className="Operations">
      {operations.map(
        (
          {
            account,
            amount,
            asset,
            balanceId,
            bumpTo,
            buyAmount,
            buying,
            claimants,
            clearFlags,
            destination,
            destAsset,
            flags,
            footprint,
            function: scFunction,
            from,
            highThreshold,
            inflationDest,
            limit,
            line,
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
            name,
            offerId,
            parameters,
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
            value,
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
                    operationKey={t("Account")}
                    operationValue={account}
                  />
                ) : null}

                {amount ? (
                  <KeyValueList
                    operationKey={t("Amount")}
                    operationValue={`${amount}`}
                  />
                ) : null}

                {asset ? (
                  <KeyValueList
                    operationKey={t("Asset Code")}
                    operationValue={`${asset.code}`}
                  />
                ) : null}

                {asset?.issuer ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Asset Issuer")}
                    operationValue={`${asset.issuer}`}
                  />
                ) : null}

                {balanceId ? (
                  <KeyValueList
                    operationKey={t("Balance Id")}
                    operationValue={balanceId}
                  />
                ) : null}

                {bumpTo ? (
                  <KeyValueList
                    operationKey={t("Bump To")}
                    operationValue={bumpTo}
                  />
                ) : null}

                {buyAmount ? (
                  <KeyValueList
                    operationKey={t("Amount")}
                    operationValue={buyAmount}
                  />
                ) : null}

                {buying ? (
                  <KeyValueList
                    operationKey={t("Buying")}
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
                        <div>
                          {t("Claimant")} {index + 1}
                        </div>
                        <KeyValueWithPublicKey
                          operationKey={t("Destination")}
                          operationValue={_destination}
                        />
                        {/* TODO: Add appicable predicate UI */}
                      </div>
                    ))
                  : null}

                {clearFlags ? (
                  <KeyValueList
                    operationKey={t("Clear Flags")}
                    operationValue={AuthorizationMap[clearFlags]}
                  />
                ) : null}

                {destAsset ? (
                  <KeyValueList
                    operationKey={t("Destination Asset")}
                    operationValue={`${destAsset.code}`}
                  />
                ) : null}

                {destination ? (
                  <>
                    <KeyValueWithPublicKey
                      operationKey={t("Destination")}
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

                {footprint ? (
                  <KeyValueWithScValue
                    operationKey={t("Footprint")}
                    operationValue={JSON.stringify(footprint)}
                  />
                ) : null}

                {from ? (
                  <KeyValueWithPublicKey
                    operationKey={t("From")}
                    operationValue={from}
                  />
                ) : null}

                {highThreshold ? (
                  <KeyValueList
                    operationKey={t("High Threshold")}
                    operationValue={highThreshold}
                  />
                ) : null}

                {inflationDest ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Inflation Destination")}
                    operationValue={inflationDest}
                  />
                ) : null}

                {lowThreshold ? (
                  <KeyValueList
                    operationKey={t("Low Threshold")}
                    operationValue={lowThreshold}
                  />
                ) : null}

                {masterWeight ? (
                  <KeyValueList
                    operationKey={t("Master Weight")}
                    operationValue={masterWeight}
                  />
                ) : null}

                {limit ? (
                  <KeyValueList
                    operationKey={t("Limit")}
                    operationValue={limit}
                  />
                ) : null}

                {line ? (
                  <>
                    <KeyValueList
                      operationKey={t("Code")}
                      operationValue={line.code}
                    />
                    <KeyValueWithPublicKey
                      operationKey={t("Issuer")}
                      operationValue={line.issuer}
                    />
                  </>
                ) : null}

                {liquidityPoolId ? (
                  <KeyValueList
                    operationKey={t("Liquidity Pool ID")}
                    operationValue={truncatedPoolId(liquidityPoolId)}
                  />
                ) : null}

                {maxAmountA ? (
                  <KeyValueList
                    operationKey={t("Max Amount A")}
                    operationValue={maxAmountA}
                  />
                ) : null}

                {maxAmountB ? (
                  <KeyValueList
                    operationKey={t("Max Amount B")}
                    operationValue={maxAmountB}
                  />
                ) : null}
                {maxPrice ? (
                  <KeyValueList
                    operationKey={t("Max Price")}
                    operationValue={maxPrice}
                  />
                ) : null}
                {minAmountA ? (
                  <KeyValueList
                    operationKey={t("Min Amount A")}
                    operationValue={minAmountA}
                  />
                ) : null}

                {minAmountB ? (
                  <KeyValueList
                    operationKey={t("Min Amount B")}
                    operationValue={minAmountB}
                  />
                ) : null}
                {minPrice ? (
                  <KeyValueList
                    operationKey={t("Min Price")}
                    operationValue={minPrice}
                  />
                ) : null}

                {medThreshold ? (
                  <KeyValueList
                    operationKey={t("Medium Threshold")}
                    operationValue={medThreshold}
                  />
                ) : null}

                {name ? (
                  <KeyValueList
                    operationKey={t("Name")}
                    operationValue={name}
                  />
                ) : null}

                {offerId ? (
                  <KeyValueList
                    operationKey={t("Offer Id")}
                    operationValue={offerId}
                  />
                ) : null}

                {parameters ? (
                  <KeyValueWithScValue
                    operationKey={t("Parameters")}
                    operationValue={JSON.stringify(parameters)}
                  />
                ) : null}

                {path?.length ? <PathList paths={path} /> : null}

                {price ? (
                  <KeyValueList
                    operationKey={t("Price")}
                    operationValue={price}
                  />
                ) : null}

                {scFunction ? (
                  <KeyValueWithScValue
                    operationKey={t("Function")}
                    operationValue={JSON.stringify(scFunction)}
                  />
                ) : null}

                {sendAsset ? (
                  <KeyValueList
                    operationKey={t("Sending Asset")}
                    operationValue={`${sendAsset.code}`}
                  />
                ) : null}

                {seller ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Seller")}
                    operationValue={seller}
                  />
                ) : null}

                {selling ? (
                  <KeyValueList
                    operationKey={t("Selling")}
                    operationValue={selling.code}
                  />
                ) : null}

                {setFlags ? (
                  <KeyValueList
                    operationKey={t("Set Flags")}
                    operationValue={AuthorizationMap[setFlags]}
                  />
                ) : null}

                {signer?.ed25519PublicKey ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Signer")}
                    operationValue={signer.ed25519PublicKey}
                  />
                ) : null}
                {signer?.sha256Hash ? (
                  <KeyValueList
                    operationKey={t("Signer")}
                    operationValue={formattedBuffer(signer?.sha256Hash?.data)}
                  />
                ) : null}
                {signer?.preAuthTx ? (
                  <KeyValueList
                    operationKey={t("Signer")}
                    operationValue={formattedBuffer(signer.preAuthTx.data)}
                  />
                ) : null}
                {signer?.weight ? (
                  <KeyValueList
                    operationKey={t("Weight")}
                    operationValue={signer.weight}
                  />
                ) : null}

                {source ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Source")}
                    operationValue={source}
                  />
                ) : null}

                {sponsoredId ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Sponsored Id")}
                    operationValue={sponsoredId}
                  />
                ) : null}

                {trustor ? (
                  <KeyValueWithPublicKey
                    operationKey={t("Trustor")}
                    operationValue={trustor}
                  />
                ) : null}

                {value?.type ? (
                  <KeyValueList
                    operationKey={t("Value Type")}
                    operationValue={value.type}
                  />
                ) : null}

                {value?.data ? (
                  <KeyValueList
                    operationKey={t("Value Data")}
                    operationValue={formattedBuffer(value.data)}
                  />
                ) : null}

                {Object.entries(rest).map(([k, v]) => (
                  <KeyValueList
                    key={k}
                    operationKey={k}
                    operationValue={
                      typeof v === "string" ? v : JSON.stringify(v)
                    }
                  />
                ))}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
};
