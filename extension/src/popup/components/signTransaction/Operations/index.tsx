import React, { useEffect, useState } from "react";
import { Icon, IconButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import BigNumber from "bignumber.js";
import {
  xdr,
  buildInvocationTree,
  Operation,
  Asset,
  Signer,
} from "stellar-sdk";

import {
  CLAIM_PREDICATES,
  FLAG_TYPES,
  OPERATION_TYPES,
  TRANSACTION_WARNING,
} from "constants/transaction";

import { FlaggedKeys } from "types/transactions";

import {
  truncatedPoolId,
  truncatedPublicKey,
  truncateString,
} from "helpers/stellar";
import {
  getAttrsFromSorobanTxOp,
  formatTokenAmount,
} from "popup/helpers/soroban";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";

import "./styles.scss";
import { INDEXER_URL } from "@shared/constants/mercury";
import { useSelector } from "react-redux";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

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

type FLAGS = { [key in FLAG_TYPES]: boolean };

const KeyValueList = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: string | number | React.ReactNode;
}) => (
  <div className="Operations__pair" data-testid="OperationKeyVal">
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
  <div className="Operations__pair--smart-contract">
    <div>
      {operationKey}
      {operationKey ? ":" : null}
    </div>
    <div className="Operations__scValue">
      <div>
        <pre>{JSON.stringify(operationValue, null, 2)}</pre>
      </div>
    </div>
  </div>
);

const KeyValueWithScAuth = ({
  operationKey,
  operationValue,
}: {
  operationKey: string;
  operationValue: xdr.SorobanAuthorizationEntry[];
}) => {
  const firstEntry = operationValue[0];
  const rootJson = buildInvocationTree(firstEntry.rootInvocation());
  return (
    <div className="Operations__pair--smart-contract">
      <div>
        {operationKey}
        {operationKey ? ":" : null}
      </div>
      <div className="Operations__scValue">
        <div>
          <pre>
            {JSON.stringify(
              rootJson,
              (_, val) => (typeof val === "bigint" ? val.toString() : val),
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};

const KeyValueSigner = ({ signer }: { signer: Signer }) => {
  const { t } = useTranslation();

  function renderSignerType() {
    if ("ed25519PublicKey" in signer) {
      return (
        <KeyValueList
          operationKey={t("Signer Key")}
          operationValue={signer.ed25519PublicKey}
        />
      );
    }
    if ("sha256Hash" in signer) {
      return (
        <KeyValueList
          operationKey={t("Signer Sha256 Hash")}
          operationValue={signer.sha256Hash}
        />
      );
    }

    if ("preAuthTx" in signer) {
      return (
        <KeyValueList
          operationKey={t("Pre Auth Transaction")}
          operationValue={signer.preAuthTx}
        />
      );
    }

    if ("ed25519SignedPayload" in signer) {
      return (
        <KeyValueList
          operationKey={t("Signed Payload")}
          operationValue={signer.ed25519SignedPayload}
        />
      );
    }
    return <></>;
  }

  return (
    <>
      {renderSignerType()}
      <KeyValueList
        operationKey={t("Signer Weight")}
        operationValue={signer.weight}
      />
    </>
  );
};

const PathList = ({ paths }: { paths: Asset[] }) => {
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
      <KeyValueList
        key={flag}
        operationKey={FLAG_TYPES[flag as keyof typeof FLAG_TYPES]}
        operationValue={
          // clawbackEnabled will be undefined if not being cleared
          typeof value === "undefined" ? "undefined" : value.toString()
        }
      />
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
          variant="error"
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
          variant="error"
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
  operations = [] as Operation[],
}: {
  flaggedKeys: FlaggedKeys;
  isMemoRequired: boolean;
  operations: Operation[];
}) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

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

  const [contractId, setContractId] = useState("");
  const [decimals, setDecimals] = useState(0);

  useEffect(() => {
    if (!contractId) return;
    const fetchContractDecimals = async () => {
      const response = await fetch(
        `${INDEXER_URL}/token-details/${contractId}?pub_key=${publicKey}&network=${networkDetails.network}&soroban_url=${networkDetails.sorobanRpcUrl}`,
      );
      if (!response.ok) {
        throw new Error("failed to fetch token details");
      }
      const tokenDetails = await response.json();
      setDecimals(tokenDetails.decimals);
    };

    fetchContractDecimals();
  }, [
    contractId,
    networkDetails.network,
    networkDetails.sorobanRpcUrl,
    publicKey,
  ]);

  function renderOpByType(op: Operation) {
    // TODO: fetch token decimals in invokeHostFn case
    // TODO: when should we use <DestinationWarning />
    // TODO: add invokeHostFn
    switch (op.type) {
      case "createAccount": {
        const account = op.destination;
        const startingBalance = op.startingBalance;
        return (
          <>
            <KeyValueWithPublicKey
              operationKey={t("Account")}
              operationValue={account}
            />
            <KeyValueWithPublicKey
              operationKey={t("Starting Balance")}
              operationValue={startingBalance}
            />
          </>
        );
      }

      case "payment": {
        const account = op.destination;
        const amount = op.amount;
        const asset = op.asset;
        return (
          <>
            <KeyValueWithPublicKey
              operationKey={t("Account")}
              operationValue={account}
            />
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
          </>
        );
      }

      case "pathPaymentStrictReceive": {
        const {
          sendAsset,
          sendMax,
          destination,
          destAsset,
          destAmount,
          path,
        } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={sendAsset.code}
            />
            <KeyValueList
              operationKey={t("Send Max")}
              operationValue={sendMax}
            />
            <KeyValueWithPublicKey
              operationKey={t("Destination Address")}
              operationValue={destination}
            />
            <KeyValueWithPublicKey
              operationKey={t("Destination Asset")}
              operationValue={destAsset.code}
            />
            <KeyValueList
              operationKey={t("Destination Amount")}
              operationValue={destAmount}
            />
            <PathList paths={path} />
          </>
        );
      }

      case "pathPaymentStrictSend": {
        const {
          sendAsset,
          sendAmount,
          destination,
          destAsset,
          destMin,
          path,
        } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={sendAsset.code}
            />
            <KeyValueList
              operationKey={t("Send Amount")}
              operationValue={sendAmount}
            />
            <KeyValueWithPublicKey
              operationKey={t("Destination Address")}
              operationValue={destination}
            />
            <KeyValueWithPublicKey
              operationKey={t("Destination Asset")}
              operationValue={destAsset.code}
            />
            <KeyValueList
              operationKey={t("Destination Minimum")}
              operationValue={destMin}
            />
            <PathList paths={path} />
          </>
        );
      }

      case "createPassiveSellOffer": {
        const { selling, buying, amount, price } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Buying")}
              operationValue={buying.code}
            />
            <KeyValueList
              operationKey={t("Amount")}
              operationValue={`${formatTokenAmount(
                BigNumber(amount),
                decimals,
              )}`}
            />
            <KeyValueList
              operationKey={t("Selling")}
              operationValue={selling.code}
            />
            <KeyValueList operationKey={t("Price")} operationValue={price} />
          </>
        );
      }

      case "manageSellOffer": {
        const { offerId } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Offer ID")}
              operationValue={offerId}
            />
          </>
        );
      }

      case "manageBuyOffer": {
        const { selling, buying, buyAmount, price, offerId } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Offer ID")}
              operationValue={offerId}
            />
            <KeyValueList
              operationKey={t("Buying")}
              operationValue={buying.code}
            />
            <KeyValueList
              operationKey={t("Buy Amount")}
              operationValue={buyAmount}
            />
            <KeyValueList
              operationKey={t("Selling")}
              operationValue={selling.code}
            />
            <KeyValueList operationKey={t("Price")} operationValue={price} />
          </>
        );
      }

      case "setOptions": {
        const {
          inflationDest,
          clearFlags,
          setFlags,
          masterWeight,
          lowThreshold,
          medThreshold,
          highThreshold,
          homeDomain,
          signer,
        } = op;
        return (
          <>
            <KeyValueSigner signer={signer} />
            <KeyValueList
              operationKey={t("Inflation Destination")}
              operationValue={inflationDest || ""}
            />
            <KeyValueList
              operationKey={t("Home Domain")}
              operationValue={homeDomain || ""}
            />
            <KeyValueList
              operationKey={t("Inflation Destination")}
              operationValue={inflationDest || ""}
            />
            <KeyValueList
              operationKey={t("High Threshold")}
              operationValue={highThreshold?.toString() || ""}
            />
            <KeyValueList
              operationKey={t("Medium Threshold")}
              operationValue={medThreshold?.toString() || ""}
            />
            <KeyValueList
              operationKey={t("Low Threshold")}
              operationValue={lowThreshold?.toString() || ""}
            />
            <KeyValueList
              operationKey={t("Master Weight")}
              operationValue={masterWeight?.toString() || ""}
            />
            <KeyValueList
              operationKey={t("Set Flags")}
              operationValue={setFlags?.toString() || ""}
            />
            <KeyValueList
              operationKey={t("Clear Flags")}
              operationValue={clearFlags?.toString() || ""}
            />
          </>
        );
      }

      case "changeTrust": {
        // TODO: make key val for line by type
        const { source, type, limit } = op;
        return (
          <>
            <KeyValueList operationKey={t("Source")} operationValue={source} />
            {/* <KeyValueList
              operationKey={t("Line")}
              operationValue={line}
            /> */}
            <KeyValueList operationKey={t("Type")} operationValue={type} />
            <KeyValueList operationKey={t("Limit")} operationValue={limit} />
          </>
        );
      }

      case "allowTrust": {
        // TODO: make key val for authorize by type
        const { trustor, assetCode } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Trustor")}
              operationValue={trustor}
            />
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={assetCode}
            />
          </>
        );
      }

      case "accountMerge": {
        const { destination } = op;
        return (
          <KeyValueList
            operationKey={t("Destination")}
            operationValue={destination}
          />
        );
      }

      case "manageData": {
        const { name, value } = op;
        return (
          <>
            <KeyValueList operationKey={t("Name")} operationValue={name} />
            <KeyValueList
              operationKey={t("Value")}
              operationValue={value?.toString()}
            />
          </>
        );
      }

      case "bumpSequence": {
        const { bumpTo } = op;
        return (
          <KeyValueList operationKey={t("Bump To")} operationValue={bumpTo} />
        );
      }

      case "createClaimableBalance": {
        // TODO: make key val for claimants
        const { asset, amount } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
          </>
        );
      }

      case "claimClaimableBalance": {
        const { balanceId } = op;
        return (
          <KeyValueList
            operationKey={t("Balance ID")}
            operationValue={balanceId}
          />
        );
      }

      case "beginSponsoringFutureReserves": {
        const { sponsoredId } = op;
        return (
          <KeyValueList
            operationKey={t("Sponsored ID")}
            operationValue={sponsoredId}
          />
        );
      }

      case "beginSponsoringFutureReserves": {
        const { sponsoredId } = op;
        return (
          <KeyValueList
            operationKey={t("Sponsored ID")}
            operationValue={sponsoredId}
          />
        );
      }

      case "endSponsoringFutureReserves": {
        const { source, type } = op;
        return (
          <>
            <KeyValueList operationKey={t("Source")} operationValue={source} />
            <KeyValueList operationKey={t("Type")} operationValue={type} />
          </>
        );
      }

      case "revokeSponsorship": {
        const t = op;
        // revoke trustline sponsorhip
        if ("account" in op && "asset" in op) {
          const { account, asset } = op;
          return (
            <>
              <KeyValueList
                operationKey={t("Account")}
                operationValue={account}
              />
              {"liquidityPoolId" in asset && (
                <KeyValueList
                  operationKey={t("Liquidity Pool ID")}
                  operationValue={asset.liquidityPoolId}
                />
              )}
              {"code" in asset && (
                <KeyValueList
                  operationKey={t("Liquidity Pool ID")}
                  operationValue={asset.code}
                />
              )}
            </>
          );
        }
        // revoke offer sponsorship
        if ("seller" in op && "offerId" in op) {
          const { seller, offerId } = op;
          return (
            <>
              <KeyValueList
                operationKey={t("Seller")}
                operationValue={seller}
              />
              <KeyValueList
                operationKey={t("Offer ID")}
                operationValue={offerId}
              />
            </>
          );
        }
        // revoke data sponsorship
        if ("account" in op && "name" in op) {
          const { account, name } = op;
          return (
            <>
              <KeyValueList
                operationKey={t("Account")}
                operationValue={account}
              />
              <KeyValueList operationKey={t("Name")} operationValue={name} />
            </>
          );
        }
        //  revoke claimable sponsorship
        if ("balanceId" in op) {
          const { balanceId } = op;
          return (
            <KeyValueList
              operationKey={t("Balance ID")}
              operationValue={balanceId}
            />
          );
        }
        // revoke liquidity pool sponsorship
        if ("liquidityPoolId" in op) {
          const { liquidityPoolId } = op;
          return (
            <KeyValueList
              operationKey={t("Liquidity Pool ID")}
              operationValue={liquidityPoolId}
            />
          );
        }
        // revoke signer sponsorship
        if ("signer" in op && "account" in op) {
          // TODO: make key val for SignerKeyOptions by type
          const { account } = op;
          return (
            <>
              {/* <KeyValueList
                operationKey={t("Signer")}
                operationValue={signer}
              /> */}
              <KeyValueList
                operationKey={t("Account")}
                operationValue={account}
              />
            </>
          );
        }

        return (
          <KeyValueList
            operationKey={t("Account")}
            operationValue={op.account}
          />
        );
      }

      case "clawback": {
        const { asset, amount, from } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
            <KeyValueWithPublicKey
              operationKey={t("From")}
              operationValue={from}
            />
          </>
        );
      }

      case "clawbackClaimableBalance": {
        const { balanceId } = op;
        return (
          <KeyValueList
            operationKey={t("Balance ID")}
            operationValue={balanceId}
          />
        );
      }

      case "setTrustLineFlags": {
        const { trustor, asset, flags } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Trustor")}
              operationValue={trustor}
            />
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueList
              operationKey={t("Authorized")}
              operationValue={flags.authorized}
            />
            <KeyValueList
              operationKey={t("Authorized To Maintain Liabilities")}
              operationValue={flags.authorizedToMaintainLiabilities}
            />
            <KeyValueList
              operationKey={t("Clawback Enabled")}
              operationValue={flags.clawbackEnabled}
            />
          </>
        );
      }

      case "liquidityPoolDeposit": {
        const {
          liquidityPoolId,
          maxAmountA,
          maxAmountB,
          maxPrice,
          minPrice,
        } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Liquidity Pool ID")}
              operationValue={liquidityPoolId}
            />
            <KeyValueList
              operationKey={t("Max Amount A")}
              operationValue={maxAmountA}
            />
            <KeyValueList
              operationKey={t("Max Amount B")}
              operationValue={maxAmountB}
            />
            <KeyValueList
              operationKey={t("Max Price")}
              operationValue={maxPrice}
            />
            <KeyValueList
              operationKey={t("Min Price")}
              operationValue={minPrice}
            />
          </>
        );
      }

      case "liquidityPoolWithdraw": {
        const { liquidityPoolId, amount, minAmountA, minAmountB } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Liquidity Pool ID")}
              operationValue={liquidityPoolId}
            />
            <KeyValueList
              operationKey={t("Min Amount A")}
              operationValue={minAmountA}
            />
            <KeyValueList
              operationKey={t("Min Amount B")}
              operationValue={minAmountB}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
          </>
        );
      }

      case "extendFootprintTtl": {
        const { extendTo } = op;
        return (
          <KeyValueList
            operationKey={t("Extend TO")}
            operationValue={extendTo}
          />
        );
      }

      case "restoreFootprint":
      case "inflation":
      default: {
        return <></>;
      }
    }
  }

  return (
    <div className="Operations">
      {operations.map((op, i: number) => {
        const operationIndex = i + 1;
        const sourceVal = op.source;
        const type = op.type;

        return (
          <div className="Operations--wrapper" key={operationIndex}>
            <div className="Operations--header">
              <strong>
                {operationIndex}. {OPERATION_TYPES[type] || type}
              </strong>
            </div>
            <div className="Operations--item">
              <KeyValueWithPublicKey
                operationKey={t("Source")}
                operationValue={sourceVal || ""}
              />
              {renderOpByType(op)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
