import React from "react";
import { Icon, IconButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Operation } from "stellar-sdk";

import {
  FLAG_TYPES,
  OPERATION_TYPES,
  TRANSACTION_WARNING,
} from "constants/transaction";

import { FlaggedKeys } from "types/transactions";

import { truncateString, truncatedPoolId } from "helpers/stellar";
import {
  KeyValueClaimants,
  KeyValueInvokeHostFn,
  KeyValueLine,
  KeyValueList,
  KeyValueSigner,
  KeyValueSignerKeyOptions,
  KeyValueWithPublicKey,
  PathList,
} from "./KeyVal";
import "./styles.scss";

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
          icon={<Icon.InfoCircle />}
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
          icon={<Icon.InfoCircle />}
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

  const AuthorizationMapToDisplay: { [index: string]: string } = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "1": "Authorization Required",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "2": "Authorization Revocable",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "4": "Authorization Immutable",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "8": "Authorization Clawback Enabled",
  };

  function renderOpByType(op: Operation) {
    switch (op.type) {
      case "createAccount": {
        const destination = op.destination;
        const startingBalance = op.startingBalance;
        return (
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
            <KeyValueList
              operationKey={t("Starting Balance")}
              operationValue={`${startingBalance} XLM`}
            />
          </>
        );
      }

      case "payment": {
        const destination = op.destination;
        const amount = op.amount;
        const asset = op.asset;
        return (
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
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
          </>
        );
      }

      case "pathPaymentStrictReceive": {
        const { sendAsset, sendMax, destination, destAsset, destAmount, path } =
          op;
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
              operationKey={t("Destination")}
              operationValue={destination}
            />
            <DestinationWarning
              destination={destination}
              flaggedKeys={flaggedKeys}
              isMemoRequired={isMemoRequired}
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
        const { sendAsset, sendAmount, destination, destAsset, destMin, path } =
          op;
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
              operationKey={t("Destination")}
              operationValue={destination}
            />
            <DestinationWarning
              destination={destination}
              flaggedKeys={flaggedKeys}
              isMemoRequired={isMemoRequired}
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
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
            <KeyValueList
              operationKey={t("Selling")}
              operationValue={selling.code}
            />
            <KeyValueList operationKey={t("Price")} operationValue={price} />
          </>
        );
      }

      case "manageSellOffer": {
        const { offerId, selling, buying, price, amount } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Offer ID")}
              operationValue={offerId}
            />
            <KeyValueList
              operationKey={t("Selling")}
              operationValue={selling.code}
            />
            <KeyValueList
              operationKey={t("Buying")}
              operationValue={buying.code}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
            <KeyValueList operationKey={t("Price")} operationValue={price} />
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
            {signer && <KeyValueSigner signer={signer} />}
            {inflationDest && (
              <KeyValueWithPublicKey
                operationKey={t("Inflation Destination")}
                operationValue={inflationDest}
              />
            )}
            {homeDomain && (
              <KeyValueList
                operationKey={t("Home Domain")}
                operationValue={homeDomain}
              />
            )}
            {highThreshold && (
              <KeyValueList
                operationKey={t("High Threshold")}
                operationValue={highThreshold?.toString()}
              />
            )}
            {medThreshold && (
              <KeyValueList
                operationKey={t("Medium Threshold")}
                operationValue={medThreshold?.toString()}
              />
            )}
            {lowThreshold && (
              <KeyValueList
                operationKey={t("Low Threshold")}
                operationValue={lowThreshold?.toString()}
              />
            )}
            {masterWeight && (
              <KeyValueList
                operationKey={t("Master Weight")}
                operationValue={masterWeight?.toString()}
              />
            )}
            {setFlags && (
              <KeyValueList
                operationKey={t("Set Flags")}
                operationValue={AuthorizationMapToDisplay[setFlags?.toString()]}
              />
            )}
            {clearFlags && (
              <KeyValueList
                operationKey={t("Clear Flags")}
                operationValue={
                  AuthorizationMapToDisplay[clearFlags.toString()]
                }
              />
            )}
          </>
        );
      }

      case "changeTrust": {
        const { type, limit, line } = op;
        return (
          <>
            <KeyValueLine line={line} />
            <KeyValueList operationKey={t("Type")} operationValue={type} />
            <KeyValueList operationKey={t("Limit")} operationValue={limit} />
          </>
        );
      }

      case "allowTrust": {
        const { trustor, assetCode, authorize } = op;
        return (
          <>
            <KeyValueWithPublicKey
              operationKey={t("Trustor")}
              operationValue={trustor}
            />
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={assetCode}
            />
            <KeyValueList
              operationKey={t("Authorize")}
              operationValue={authorize}
            />
          </>
        );
      }

      case "accountMerge": {
        const { destination } = op;
        return (
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
        );
      }

      case "manageData": {
        const { name, value } = op;
        return (
          <>
            <KeyValueList operationKey={t("Name")} operationValue={name} />
            {value && (
              <KeyValueList
                operationKey={t("Value")}
                operationValue={value?.toString()}
              />
            )}
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
        const { asset, amount, claimants } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
            <KeyValueClaimants claimants={claimants} />
          </>
        );
      }

      case "claimClaimableBalance": {
        const { balanceId } = op;
        return (
          <KeyValueList
            operationKey={t("Balance ID")}
            operationValue={truncateString(balanceId)}
          />
        );
      }

      case "beginSponsoringFutureReserves": {
        const { sponsoredId } = op;
        return (
          <KeyValueList
            operationKey={t("Sponsored ID")}
            operationValue={truncateString(sponsoredId)}
          />
        );
      }

      case "endSponsoringFutureReserves": {
        const { type } = op;
        return (
          <>
            <KeyValueList operationKey={t("Type")} operationValue={type} />
          </>
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
            operationValue={truncateString(balanceId)}
          />
        );
      }

      case "setTrustLineFlags": {
        const { trustor, asset, flags } = op;
        return (
          <>
            <KeyValueWithPublicKey
              operationKey={t("Trustor")}
              operationValue={trustor}
            />
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            {flags.authorized && (
              <KeyValueList
                operationKey={t(FLAG_TYPES.authorized)}
                operationValue={flags.authorized}
              />
            )}
            {flags.authorizedToMaintainLiabilities && (
              <KeyValueList
                operationKey={t(FLAG_TYPES.authorizedToMaintainLiabilities)}
                operationValue={flags.authorizedToMaintainLiabilities}
              />
            )}
            {flags.clawbackEnabled && (
              <KeyValueList
                operationKey={t(FLAG_TYPES.clawbackEnabled)}
                operationValue={flags.clawbackEnabled}
              />
            )}
          </>
        );
      }

      case "liquidityPoolDeposit": {
        const { liquidityPoolId, maxAmountA, maxAmountB, maxPrice, minPrice } =
          op;
        return (
          <>
            <KeyValueList
              operationKey={t("Liquidity Pool ID")}
              operationValue={truncatedPoolId(liquidityPoolId)}
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
              operationValue={truncatedPoolId(liquidityPoolId)}
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
            operationKey={t("Extend To")}
            operationValue={extendTo}
          />
        );
      }

      case "invokeHostFunction": {
        return <KeyValueInvokeHostFn op={op} />;
      }

      case "restoreFootprint":
      case "inflation":
      default: {
        // OperationType is missing some types
        // Issue: https://github.com/stellar/js-stellar-base/issues/728
        const type = op.type as string;
        if (type === "revokeTrustlineSponsorship") {
          const _op = op as unknown as Operation.RevokeTrustlineSponsorship;
          const { account, asset } = _op;
          return (
            <>
              <KeyValueWithPublicKey
                operationKey={t("Account")}
                operationValue={account}
              />
              {"liquidityPoolId" in asset && (
                <KeyValueList
                  operationKey={t("Liquidity Pool ID")}
                  operationValue={truncatedPoolId(asset.liquidityPoolId)}
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
        if (type === "revokeAccountSponsorship") {
          const _op = op as unknown as Operation.RevokeAccountSponsorship;
          const { account } = _op;
          return (
            <KeyValueWithPublicKey
              operationKey={t("Account")}
              operationValue={account}
            />
          );
        }
        if (type === "revokeOfferSponsorship") {
          const _op = op as unknown as Operation.RevokeOfferSponsorship;
          const { seller, offerId } = _op;
          return (
            <>
              <KeyValueWithPublicKey
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
        if (type === "revokeDataSponsorship") {
          const _op = op as unknown as Operation.RevokeDataSponsorship;
          const { account, name } = _op;
          return (
            <>
              <KeyValueWithPublicKey
                operationKey={t("Account")}
                operationValue={account}
              />
              <KeyValueList operationKey={t("Name")} operationValue={name} />
            </>
          );
        }
        if (type === "revokeClaimableBalanceSponsorship") {
          const _op =
            op as unknown as Operation.RevokeClaimableBalanceSponsorship;
          const { balanceId } = _op;
          return (
            <KeyValueList
              operationKey={t("Balance ID")}
              operationValue={truncateString(balanceId)}
            />
          );
        }
        if (type === "revokeSignerSponsorship") {
          const _op = op as unknown as Operation.RevokeSignerSponsorship;
          const { account, signer } = _op;
          return (
            <>
              <KeyValueSignerKeyOptions signer={signer} />
              <KeyValueWithPublicKey
                operationKey={t("Account")}
                operationValue={account}
              />
            </>
          );
        }
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
          <div
            className="Operations--wrapper"
            key={operationIndex}
            data-testid="OperationsWrapper"
          >
            <div className="Operations--header">
              <Icon.Code01 />
              <strong className="OpType">
                {OPERATION_TYPES[type] || type}
              </strong>
            </div>
            <div className="Operations--item">
              {sourceVal && (
                <KeyValueWithPublicKey
                  operationKey={t("Source")}
                  operationValue={sourceVal || ""}
                />
              )}
              {renderOpByType(op)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
