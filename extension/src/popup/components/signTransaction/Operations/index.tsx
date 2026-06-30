import React, { useEffect } from "react";
import { Icon, IconButton } from "@stellar/design-system";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Operation, xdr } from "stellar-sdk";

import {
  FLAG_TYPES,
  OPERATION_TYPES,
  TRANSACTION_WARNING,
} from "constants/transaction";

import { FlaggedKeys } from "types/transactions";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { truncateString, truncatedPoolId } from "helpers/stellar";
import { scanAsset } from "popup/helpers/blockaid";
import { addressToString, getCreateContractArgs } from "popup/helpers/soroban";
import { CopyValue } from "popup/components/CopyValue";
import {
  KeyValueClaimants,
  KeyValueInvokeHostFn,
  KeyValueInvokeHostFnArgs,
  KeyValueLine,
  KeyValueList,
  KeyValueSigner,
  KeyValueSignerKeyOptions,
  KeyValueWithPublicKey,
  PathList,
} from "./KeyVal";

import "./styles.scss";

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

const MasterKeyDisableWarning = () => {
  const { t } = useTranslation();

  // Rendered as a full-width banner (not a KeyValueList row) so the message
  // wraps instead of being truncated in the right-aligned value column.
  return (
    <div
      className="Operations__warning"
      data-testid="MasterKeyDisableWarning"
      role="alert"
    >
      <Icon.AlertTriangle aria-hidden="true" />
      <span>
        {t(
          "This transaction disables your account's master key. You may permanently lose access to this account unless another signer with sufficient weight is added.",
        )}
      </span>
    </div>
  );
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
  const isDestMemoRequired = flaggedTags.includes(
    TRANSACTION_WARNING.memoRequired,
  );

  return (
    <>
      {isMemoRequired ? (
        <MemoRequiredWarning isDestMemoRequired={isDestMemoRequired} />
      ) : null}
    </>
  );
};

// On Stellar a non-native asset is identified by (code, issuer), not by code
// alone, so the signing UI must show the issuer for any value-bearing asset to
// let the user distinguish a legitimate asset from a look-alike using the same
// code. Native XLM has no issuer, so nothing is rendered for it. Mirrors the
// issuer row already shown by changeTrust (KeyValueLine) and PathList.
const KeyValueAssetIssuer = ({ issuer }: { issuer?: string }) => {
  const { t } = useTranslation();

  return issuer ? (
    <KeyValueList
      operationKey={t("Asset Issuer")}
      operationValue={
        <CopyValue value={issuer} displayValue={truncateString(issuer)} />
      }
    />
  ) : null;
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
    "1": "Authorization Required",

    "2": "Authorization Revocable",

    "4": "Authorization Immutable",

    "8": "Authorization Clawback Enabled",
  };

  // Account flags are a bitmask, so a combined value (e.g. REVOCABLE |
  // CLAWBACK = 10) is not a key in AuthorizationMapToDisplay. Decode each known
  // bit individually so combined flags are never rendered as a blank value, and
  // surface any remaining (unrecognized) bits so a future protocol flag isn't
  // silently hidden when combined with a known one.
  const decodeAuthorizationFlags = (bits: number) => {
    const labels: string[] = [];
    let remaining = bits;
    Object.entries(AuthorizationMapToDisplay).forEach(([bit, label]) => {
      const value = Number(bit);
      if ((bits & value) !== 0) {
        labels.push(t(label));
        remaining &= ~value;
      }
    });
    if (remaining !== 0) {
      labels.push(t("Unknown ({{bits}})", { bits: remaining }));
    }
    return labels.join(", ");
  };

  const RenderOpByType = ({ op }: { op: Operation }) => {
    const networkDetails = useSelector(settingsNetworkDetailsSelector);

    useEffect(() => {
      const scan = async () => {
        let sendAsset;
        let destAsset;

        if (op.type === "payment") {
          sendAsset = op.asset;
        }

        if (
          op.type === "pathPaymentStrictReceive" ||
          op.type === "pathPaymentStrictSend"
        ) {
          sendAsset = op.sendAsset;
          destAsset = op.destAsset;
        }

        if (sendAsset) {
          await scanAsset(
            `${sendAsset.code}-${sendAsset.issuer}`,
            networkDetails,
          );
        }

        if (destAsset) {
          await scanAsset(
            `${destAsset.code}-${destAsset.issuer}`,
            networkDetails,
          );
        }
      };

      scan();
    }, [networkDetails, op]);

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
            <KeyValueAssetIssuer issuer={asset.issuer} />
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
            <KeyValueAssetIssuer issuer={sendAsset.issuer} />
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
            <KeyValueAssetIssuer issuer={destAsset.issuer} />
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
            <KeyValueAssetIssuer issuer={sendAsset.issuer} />
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
            <KeyValueAssetIssuer issuer={destAsset.issuer} />
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
            <KeyValueAssetIssuer issuer={buying.issuer} />
            <KeyValueList operationKey={t("Amount")} operationValue={amount} />
            <KeyValueList
              operationKey={t("Selling")}
              operationValue={selling.code}
            />
            <KeyValueAssetIssuer issuer={selling.issuer} />
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
            <KeyValueAssetIssuer issuer={selling.issuer} />
            <KeyValueList
              operationKey={t("Buying")}
              operationValue={buying.code}
            />
            <KeyValueAssetIssuer issuer={buying.issuer} />
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
            <KeyValueAssetIssuer issuer={buying.issuer} />
            <KeyValueList
              operationKey={t("Buy Amount")}
              operationValue={buyAmount}
            />
            <KeyValueList
              operationKey={t("Selling")}
              operationValue={selling.code}
            />
            <KeyValueAssetIssuer issuer={selling.issuer} />
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
            {homeDomain !== undefined && (
              <KeyValueList
                operationKey={t("Home Domain")}
                operationValue={
                  homeDomain === "" ? t("(clearing home domain)") : homeDomain
                }
              />
            )}
            {highThreshold !== undefined && (
              <KeyValueList
                operationKey={t("High Threshold")}
                operationValue={highThreshold.toString()}
              />
            )}
            {medThreshold !== undefined && (
              <KeyValueList
                operationKey={t("Medium Threshold")}
                operationValue={medThreshold.toString()}
              />
            )}
            {lowThreshold !== undefined && (
              <KeyValueList
                operationKey={t("Low Threshold")}
                operationValue={lowThreshold.toString()}
              />
            )}
            {masterWeight !== undefined && (
              <KeyValueList
                operationKey={t("Master Weight")}
                operationValue={masterWeight.toString()}
              />
            )}
            {masterWeight === 0 && <MasterKeyDisableWarning />}
            {setFlags !== undefined && (
              <KeyValueList
                operationKey={t("Set Flags")}
                operationValue={decodeAuthorizationFlags(setFlags)}
              />
            )}
            {clearFlags !== undefined && (
              <KeyValueList
                operationKey={t("Clear Flags")}
                operationValue={decodeAuthorizationFlags(clearFlags)}
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
        // A null/undefined value means the data entry is being deleted; an
        // empty value decodes to a zero-length buffer. Always render the row so
        // a deletion is never silently hidden from the approval screen.
        const isDeletingEntry = value === undefined || value === null;
        return (
          <>
            <KeyValueList operationKey={t("Name")} operationValue={name} />
            <KeyValueList
              operationKey={t("Value")}
              operationValue={
                isDeletingEntry ? t("(deleting entry)") : value.toString()
              }
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
        const { asset, amount, claimants } = op;
        return (
          <>
            <KeyValueList
              operationKey={t("Asset Code")}
              operationValue={asset.code}
            />
            <KeyValueAssetIssuer issuer={asset.issuer} />
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
            {/*
              A flag present in the decoded `flags` object is being changed:
              `true` enables it, `false` *clears* it. Use a presence check so a
              cleared flag is never hidden, and render the value explicitly — a
              raw boolean is not rendered by React.
            */}
            {flags.authorized !== undefined && (
              <KeyValueList
                operationKey={t(FLAG_TYPES.authorized)}
                operationValue={flags.authorized ? t("Enabled") : t("Disabled")}
              />
            )}
            {flags.authorizedToMaintainLiabilities !== undefined && (
              <KeyValueList
                operationKey={t(FLAG_TYPES.authorizedToMaintainLiabilities)}
                operationValue={
                  flags.authorizedToMaintainLiabilities
                    ? t("Enabled")
                    : t("Disabled")
                }
              />
            )}
            {flags.clawbackEnabled !== undefined && (
              <KeyValueList
                operationKey={t(FLAG_TYPES.clawbackEnabled)}
                operationValue={
                  flags.clawbackEnabled ? t("Enabled") : t("Disabled")
                }
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
  };

  const RenderOpArgsByType = ({ op }: { op: Operation }) => {
    const networkDetails = useSelector(settingsNetworkDetailsSelector);

    useEffect(() => {
      const scan = async () => {
        let sendAsset;
        let destAsset;

        if (op.type === "payment") {
          sendAsset = op.asset;
        }

        if (
          op.type === "pathPaymentStrictReceive" ||
          op.type === "pathPaymentStrictSend"
        ) {
          sendAsset = op.sendAsset;
          destAsset = op.destAsset;
        }

        if (sendAsset) {
          await scanAsset(
            `${sendAsset.code}-${sendAsset.issuer}`,
            networkDetails,
          );
        }

        if (destAsset) {
          await scanAsset(
            `${destAsset.code}-${destAsset.issuer}`,
            networkDetails,
          );
        }
      };

      scan();
    }, [networkDetails, op]);

    switch (op.type) {
      case "invokeHostFunction": {
        const hostfn = op.func;

        function renderDetails() {
          switch (hostfn.switch()) {
            case xdr.HostFunctionType.hostFunctionTypeCreateContractV2():
            case xdr.HostFunctionType.hostFunctionTypeCreateContract(): {
              const createContractArgs = getCreateContractArgs(hostfn);
              const preimage = createContractArgs.contractIdPreimage;
              const createV2Args = createContractArgs.constructorArgs;

              if (preimage.switch().name === "contractIdPreimageFromAddress") {
                const preimageFromAddress = preimage.fromAddress();
                const address = preimageFromAddress.address();

                const addressType = address.switch();
                if (addressType.name === "scAddressTypeAccount") {
                  return (
                    createV2Args && (
                      <KeyValueInvokeHostFnArgs args={createV2Args} />
                    )
                  );
                }
                return (
                  <>
                    {createV2Args && (
                      <KeyValueInvokeHostFnArgs args={createV2Args} />
                    )}
                  </>
                );
              }

              // contractIdPreimageFromAsset
              return (
                <>
                  {createV2Args && (
                    <KeyValueInvokeHostFnArgs args={createV2Args} />
                  )}
                </>
              );
            }

            case xdr.HostFunctionType.hostFunctionTypeInvokeContract(): {
              const invocation = hostfn.invokeContract();
              const contractId = addressToString(invocation.contractAddress());
              const fnName = invocation.functionName().toString();
              const args = invocation.args();

              return (
                <KeyValueInvokeHostFnArgs
                  args={args}
                  contractId={contractId}
                  fnName={fnName}
                  showHeader={false}
                />
              );
            }

            case xdr.HostFunctionType.hostFunctionTypeUploadContractWasm(): {
              const wasm = hostfn.wasm().toString();
              return (
                <KeyValueList operationKey={t("wasm")} operationValue={wasm} />
              );
            }

            default:
              return <></>;
          }
        }
        return renderDetails();
      }

      default: {
        return <></>;
      }
    }
  };

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
              <Icon.Cube02 />
              <span>{OPERATION_TYPES[type] || type}</span>
            </div>
            <div className="Operations--item">
              {sourceVal && (
                <KeyValueWithPublicKey
                  operationKey={t("Source")}
                  operationValue={sourceVal || ""}
                />
              )}
              <RenderOpByType op={op} />
            </div>
            {type === "invokeHostFunction" && (
              <>
                <div className="Operations--header">
                  <Icon.BracketsEllipses />
                  <span>{t("Parameters")}</span>
                </div>
                <div className="Operations--item">
                  <RenderOpArgsByType op={op} />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
