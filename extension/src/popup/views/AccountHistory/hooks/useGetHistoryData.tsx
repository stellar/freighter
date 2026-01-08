import React, { ReactNode, useReducer } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Horizon, TransactionBuilder } from "stellar-sdk";
import { camelCase } from "lodash";
import BigNumber from "bignumber.js";
import {
  Asset as AssetSds,
  Icon,
  Text,
  TextProps,
} from "@stellar/design-system";
import i18n from "popup/helpers/localizationConfig";

import StellarLogo from "popup/assets/stellar-logo.png";

import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { HistoryResponse, useGetHistory } from "helpers/hooks/useGetHistory";
import { HistoryItemOperation } from "popup/components/accountHistory/HistoryItem";
import {
  getIsCreateClaimableBalanceSpam,
  getIsDustPayment,
  getIsPayment,
  getIsSwap,
} from "popup/helpers/account";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { getCanonicalFromAsset, isMainnet } from "helpers/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AssetIcons, HorizonOperation, TokenBalance } from "@shared/api/types";
import { OPERATION_TYPES } from "constants/transaction";
import { capitalize, formatAmount } from "popup/helpers/formatters";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  formatTokenAmount,
  getAttrsFromSorobanHorizonOp,
  getDecimalsForAsset,
} from "popup/helpers/soroban";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { getBalanceByKey } from "popup/helpers/balance";
import { AssetType } from "@shared/api/types/account-balance";
import {
  TokenDetailsResponse,
  useTokenDetails,
} from "helpers/hooks/useTokenDetails";
import {
  homeDomainsSelector,
  saveDomainForIssuer,
  saveIconsForBalances,
} from "popup/ducks/cache";
import { getAssetDomains } from "@shared/api/internal";
import { AppDispatch } from "popup/App";

export type HistorySection = {
  monthYear: string; // in format {month}:{year}
  operations: OperationDataRow[];
};

const renderIconPlaceholder = (
  tokenCode: string = "",
  size: TextProps["size"] = "sm",
) => (
  <div className="HistoryItem__icon__bordered">
    <Text
      as="div"
      size={size}
      weight="bold"
      addlClassName="HistoryItem--placeholder"
    >
      {tokenCode.slice(0, 2)}
    </Text>
  </div>
);

export const getSwapIcons = ({
  destIcon,
  sourceIcon,
  srcAssetCode,
}: {
  destIcon: string;
  sourceIcon: string;
  srcAssetCode: string;
}) => {
  return (
    <>
      <div className="HistoryItem__icon__swap-source">
        {sourceIcon && (
          <AssetSds
            size="md"
            variant="single"
            sourceOne={{
              altText: i18n.t("Swap source token logo"),
              image: sourceIcon,
            }}
          />
        )}
        {!sourceIcon && renderIconPlaceholder(srcAssetCode, "xs")}
      </div>
      <div className="HistoryItem__icon__swap-dest">
        {destIcon && (
          <AssetSds
            size="md"
            variant="single"
            sourceOne={{
              altText: i18n.t("Swap destination token logo"),
              image: destIcon,
            }}
          />
        )}
        {!destIcon && renderIconPlaceholder(destIcon, "xs")}
      </div>
    </>
  );
};

export const getPaymentIcon = ({
  destAssetCode,
  destIcon,
}: {
  destAssetCode: string;
  destIcon?: string;
}) => {
  return destIcon ? (
    <AssetSds
      size="lg"
      variant="single"
      sourceOne={{
        altText: i18n.t("Payment token logo"),
        image: destIcon,
      }}
    />
  ) : (
    renderIconPlaceholder(destAssetCode)
  );
};

export const getTransferIcons = ({
  isNative,
  isReceiving,
}: {
  isNative: boolean;
  isReceiving: boolean;
}) => (
  <>
    {isNative && (
      <AssetSds
        size="lg"
        variant="single"
        sourceOne={{
          altText: i18n.t("Stellar token logo"),
          image: StellarLogo,
        }}
      />
    )}
    {!isNative && (
      <div className="HistoryItem__icon__bordered">
        <Icon.User01 />
      </div>
    )}
    {isReceiving && (
      <div className="HistoryItem__icon__small HistoryItem--received">
        <Icon.ArrowDown />
      </div>
    )}
    {!isReceiving && (
      <div className="HistoryItem__icon__small HistoryItem--sent">
        <Icon.Send03 />
      </div>
    )}
  </>
);

export const getRowIconByType = (iconType: string) => {
  switch (iconType) {
    case "fail": {
      return (
        <div className="HistoryItem__icon__bordered">
          <Icon.Wallet03 />

          <div className="HistoryItem__icon__small HistoryItem--failed">
            <Icon.XCircle />
          </div>
        </div>
      );
    }
    case "generic": {
      return (
        <div className="HistoryItem__icon__bordered">
          <Icon.User01 />
        </div>
      );
    }

    default:
      return <></>;
  }
};

export const getActionIconByType = (iconType: string) => {
  switch (iconType) {
    case "sent": {
      return <Icon.ArrowCircleUp />;
    }
    case "received": {
      return <Icon.ArrowCircleDown />;
    }
    case "swap": {
      return <Icon.RefreshCcw03 />;
    }
    case "contractInteraction": {
      return <Icon.FileCode02 />;
    }
    case "failed": {
      return <Icon.AlertCircle />;
    }
    case "add": {
      return <Icon.PlusCircle />;
    }
    case "remove": {
      return <Icon.MinusCircle />;
    }
    case "generic": {
      return <Icon.CheckCircle />;
    }

    default:
      return <></>;
  }
};

/**
 * Extracts the actual destination address from transaction XDR
 * This is needed because Horizon API returns base G address for M addresses
 */
const extractDestinationFromXDR = async (
  txEnvelopeXdr: string,
  networkDetails: NetworkDetails,
  fallbackTo: string,
): Promise<string> => {
  if (!txEnvelopeXdr) {
    return fallbackTo;
  }

  try {
    const tx = TransactionBuilder.fromXDR(
      txEnvelopeXdr,
      networkDetails.networkPassphrase,
    );

    // Find payment operation and extract destination
    const paymentOp = tx.operations.find(
      (op) => op.type === "payment" && "destination" in op,
    );

    if (paymentOp && "destination" in paymentOp) {
      const { destination } = paymentOp;
      // Return the destination from XDR (could be M address)
      return destination;
    }

    // Also check for createAccount operation
    const createAccountOp = tx.operations.find(
      (op) => op.type === "createAccount" && "destination" in op,
    );

    if (createAccountOp && "destination" in createAccountOp) {
      const { destination } = createAccountOp;
      return destination;
    }

    // For Soroban invokeHostFunction operations, the destination is in the contract invocation
    // For now, we'll rely on the fallback (attrs.to) which should already have the correct address
    // since Soroban operations preserve muxed addresses in their arguments
  } catch (error) {
    console.error("Failed to parse XDR for destination address", error);
  }

  return fallbackTo;
};

/**
 * Retrieves the icon URL for an asset, checking the cache first and fetching from the issuer if needed.
 *
 * This helper function first checks if the icon URL is already cached in the icons object.
 * If not found, it attempts to fetch the icon URL from the issuer using the home domain
 * (either from the provided homeDomains map or by fetching it from the issuer's account).
 * The result is then cached in the icons object for future use.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.key - The asset issuer's public key
 * @param {string} params.code - The asset code (e.g., "USDC")
 * @param {NetworkDetails} params.networkDetails - Network configuration details
 * @param {{ [assetIssuer: string]: string | null }} params.homeDomains - Map of asset issuer keys to their home domains
 * @param {AssetIcons} params.icons - Cache object storing icon URLs keyed by asset canonical format
 * @returns {Promise<string | null>} The icon URL string if found, or null if not available
 */
const getIconUrl = async ({
  key,
  code,
  networkDetails,
  homeDomains,
  icons,
}: {
  key: string;
  code: string;
  networkDetails: NetworkDetails;
  homeDomains: { [assetIssuer: string]: string | null };
  icons: AssetIcons;
}) => {
  let iconUrl = icons[getCanonicalFromAsset(code, key)];
  if (!iconUrl && iconUrl !== null) {
    const homeDomain = homeDomains[key || ""] || "";
    iconUrl = await getIconUrlFromIssuer({
      key: key || "",
      code: code || "",
      networkDetails,
      homeDomain,
    });
  }

  icons[getCanonicalFromAsset(code, key)] = iconUrl || null;
  return iconUrl;
};

export interface AssetDiffSummary {
  assetCode: string;
  assetIssuer: string | null;
  decimals: number;
  amount: string;
  isCredit: boolean;
  destination?: string; // The destination public key for debits
  icon?: string; // Asset icon URL

  // For payment/createAccount flows
  sourcePublicKey?: string; // The sending public key

  // For swap flows
  sourceAmount?: string;
  sourceAssetCode?: string;
  sourceIcon?: string;
}

/**
 * Processes asset_balance_changes for a given public key and returns summaries for each asset
 * @returns Array of asset diff summaries, or empty array if none
 */
const processAssetBalanceChanges = async (
  operation: HorizonOperation,
  publicKey: string,
  networkDetails: NetworkDetails,
  homeDomains: { [assetIssuer: string]: string | null },
  icons: AssetIcons,
): Promise<AssetDiffSummary[]> => {
  // Helper to trim trailing zeros from amount strings
  const trimTrailingZeros = (amount: string): string => {
    if (!amount.includes(".")) {
      return amount;
    }

    let trimmed = amount;
    while (trimmed.endsWith("0")) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
    }

    if (trimmed.endsWith(".")) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
    }

    return trimmed;
  };

  if (
    !operation.asset_balance_changes ||
    operation.asset_balance_changes.length === 0
  ) {
    return [];
  }

  const results: AssetDiffSummary[] = [];

  for (const change of operation.asset_balance_changes) {
    // Filter to only changes involving this public key
    if (change.from !== publicKey && change.to !== publicKey) {
      continue;
    }

    // Extract asset info - handle native XLM specially
    let assetCode: string;
    let assetIssuer: string | null = null;

    if (change.asset_type === "native") {
      assetCode = "XLM";
      assetIssuer = null;
    } else {
      assetCode = change.asset_code || "";
      assetIssuer = change.asset_issuer || null;
    }

    // Determine if this is a credit (receiving) or debit (sending)
    const isCredit = change.to === publicKey;
    // Destination is the counterparty (from for credits, to for debits)
    const destination = isCredit ? change.from : change.to;

    // Get asset icon
    const icon =
      assetCode === "XLM"
        ? StellarLogo
        : await getIconUrl({
            key: assetIssuer || "",
            code: assetCode,
            networkDetails,
            homeDomains,
            icons,
          });

    // Fetch decimals based on whether it's a Soroban contract
    let decimals: number;
    try {
      decimals = await getDecimalsForAsset({
        assetIssuer,
        publicKey,
        networkDetails,
      });
    } catch (error) {
      // If decimals cannot be fetched, skip this asset entirely
      console.warn(
        `Failed to fetch decimals for asset ${assetCode} (${assetIssuer}), skipping`,
        error,
      );
      continue; // Skip this asset and move to the next one
    }

    results.push({
      assetCode,
      assetIssuer,
      decimals,
      amount: trimTrailingZeros(change.amount),
      isCredit,
      destination:
        destination && destination !== publicKey ? destination : undefined,
      icon,
    });
  }

  return results;
};

export interface OperationDataRow {
  action: string | null;
  actionIcon: string;
  amount: string | null;
  date: string;
  id: string;
  metadata: {
    [key: string]: any;
  };
  rowIcon: ReactNode;
  rowText: ReactNode;
}

export const getRowDataByOpType = async (
  publicKey: string,
  balances: AssetType[],
  operation: HistoryItemOperation,
  networkDetails: NetworkDetails,
  icons: AssetIcons,
  fetchTokenDetails: (args: {
    contractId: string;
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => Promise<TokenDetailsResponse | Error>,
  homeDomains: { [assetIssuer: string]: string | null },
): Promise<OperationDataRow> => {
  const {
    account,
    amount,
    asset_code: assetCode,
    asset_issuer: assetIssuer,
    created_at: createdAt,
    id,
    to,
    from,
    starting_balance: startingBalance,
    type,
    type_i: typeI,
    transaction_attr,
    isCreateExternalAccount = false,
    isPayment = false,
    isSwap = false,
    transaction_successful: transactionSuccessful,
  } = operation;
  const isInvokeHostFn = typeI === 24;

  const {
    operation_count: operationCount,
    fee_charged,
    memo,
    envelope_xdr: txEnvelopeXdr,
  } = transaction_attr;

  const date = new Date(Date.parse(createdAt))
    .toDateString()
    .split(" ")
    .slice(1, 3)
    .join(" ");

  const operationType = camelCase(type) as keyof typeof OPERATION_TYPES;
  const opTypeStr = OPERATION_TYPES[operationType] || "Transaction";
  const operationString = `${opTypeStr}${
    operationCount > 1 ? ` + ${operationCount - 1} ops` : ""
  }`;

  const baseMetadata = {
    createdAt,
    feeCharged: fee_charged,
    memo,
    type,
    isDustPayment: operation.isDustPayment,
  };

  if (transactionSuccessful == false) {
    return {
      action: "Failed",
      actionIcon: "failed",
      amount: null,
      date,
      id,
      metadata: {
        ...baseMetadata,
        transactionFailed: true,
      },
      rowIcon: getRowIconByType("fail"),
      rowText: i18n.t("Transaction Failed"),
    };
  }

  const sourceAssetCode =
    "source_asset_code" in operation ? operation.source_asset_code : "";
  const sourceAssetIssuer =
    "source_asset_issuer" in operation ? operation.source_asset_issuer : "";
  const srcAssetCode = sourceAssetCode || "XLM";
  const destAssetCode = assetCode || "XLM";
  const srcAmount =
    "source_amount" in operation ? operation.source_amount : null;

  if (isSwap) {
    const nonLabelAmount = formatAmount(new BigNumber(amount!).toString());
    const formattedAmount = `+${nonLabelAmount} ${destAssetCode}`;
    const formattedSrcAmount = srcAmount
      ? `${formatAmount(new BigNumber(srcAmount).toString())} ${srcAssetCode}`
      : null;

    const destIcon =
      destAssetCode === "XLM"
        ? StellarLogo
        : await getIconUrl({
            key: assetIssuer || "",
            code: destAssetCode || "",
            networkDetails,
            homeDomains,
            icons,
          });
    const sourceIcon =
      srcAssetCode === "XLM"
        ? StellarLogo
        : await getIconUrl({
            key: sourceAssetIssuer || "",
            code: srcAssetCode || "",
            networkDetails,
            homeDomains,
            icons,
          });

    return {
      action: "Swapped",
      actionIcon: "swap",
      amount: formattedAmount,
      date,
      id,
      metadata: {
        ...baseMetadata,
        destAssetCode,
        destIcon,
        destMinAmount: destAssetCode,
        formattedSrcAmount,
        isSwap,
        nonLabelAmount,
        sourceIcon,
        srcAssetCode,
      },
      rowIcon: getSwapIcons({ destIcon, srcAssetCode, sourceIcon }),
      rowText: (
        <div className="HistoryItem__description__swap-label">
          <span>{srcAssetCode}</span>
          <span className="HistoryItem__description__swap-label__separator">
            to
          </span>
          <span>{destAssetCode}</span>
        </div>
      ),
    };
  }

  if (isPayment) {
    const destination = to || "";
    const sender = from || "";

    // default to Sent if a payment to self
    const isReceiving = destination === publicKey && sender !== publicKey;
    const paymentDifference = isReceiving ? "+" : "-";
    const nonLabelAmount = formatAmount(new BigNumber(amount!).toString());
    const formattedAmount = `${paymentDifference}${nonLabelAmount} ${destAssetCode}`;

    const destIcon =
      destAssetCode === "XLM"
        ? StellarLogo
        : await getIconUrl({
            key: assetIssuer || "",
            code: destAssetCode || "",
            networkDetails,
            homeDomains,
            icons,
          });

    return {
      action: isReceiving ? i18n.t("Received") : i18n.t("Sent"),
      actionIcon: isReceiving ? "received" : "sent",
      amount: formattedAmount,
      date,
      id,
      rowIcon: getPaymentIcon({ destAssetCode, destIcon }),
      metadata: {
        ...baseMetadata,
        destAssetCode,
        destIcon,
        isPayment,
        isReceiving,
        nonLabelAmount,
        to: destination,
        from: sender,
      },
      rowText: destAssetCode,
    };
  }

  if (isInvokeHostFn) {
    const genericInvocation = {
      action: "Interacted",
      actionIcon: "contractInteraction",
      amount: null,
      date,
      id,
      metadata: {
        ...baseMetadata,
        isInvokeHostFn,
      },
      rowIcon: getRowIconByType("generic"),
      rowText: i18n.t("Contract Function"),
    };

    const assetDiffs = await processAssetBalanceChanges(
      operation,
      publicKey,
      networkDetails,
      homeDomains,
      icons,
    );

    if (assetDiffs.length > 0) {
      // Use first asset diff for the row display amount
      const primaryDiff = assetDiffs[0];
      const paymentDifference = primaryDiff.isCredit ? "+" : "-";
      const formattedAmount =
        assetDiffs.length > 1
          ? "Multiple"
          : `${paymentDifference}${primaryDiff.amount} ${primaryDiff.assetCode}`;

      const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
      const isTokenTransfer = attrs?.fnName === SorobanTokenInterface.transfer;
      const isTokenMint = attrs?.fnName === SorobanTokenInterface.mint;

      return {
        ...genericInvocation,
        amount: formattedAmount,
        metadata: {
          ...genericInvocation.metadata,
          hasAssetDiffs: true,
          assetDiffs,
          isReceiving: primaryDiff.isCredit,
          isTokenTransfer,
          isTokenMint,
          to: primaryDiff.destination,
          nonLabelAmount: primaryDiff.amount,
          destAssetCode: primaryDiff.assetCode,
        },
      };
    }

    const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
    if (!attrs) {
      return genericInvocation;
    }

    if (attrs.fnName === SorobanTokenInterface.mint) {
      const isReceiving = attrs.to === publicKey;
      const assetBalance = getBalanceByKey(
        attrs.contractId,
        balances,
        networkDetails,
      );

      if (!assetBalance) {
        return genericInvocation;
      }

      const { token, decimals } = assetBalance as TokenBalance;
      const formattedTokenAmount = formatTokenAmount(
        new BigNumber(attrs.amount),
        decimals,
      );
      const formattedAmount = `${
        isReceiving ? "+" : ""
      }${formattedTokenAmount} ${token.code}`;

      return {
        action: isReceiving ? i18n.t("Received") : i18n.t("Minted"),
        actionIcon: isReceiving ? "received" : "generic",
        amount: formattedAmount,
        date,
        id,
        metadata: {
          ...baseMetadata,
          isTokenMint: true,
          isInvokeHostFn,
        },
        rowIcon: getRowIconByType("generic"),
        rowText: capitalize(attrs.fnName),
      };
    }

    if (attrs.fnName === SorobanTokenInterface.transfer) {
      try {
        const tokenDetailsResponse = await fetchTokenDetails({
          contractId: attrs.contractId,
          publicKey,
          networkDetails,
        });

        if (
          !tokenDetailsResponse ||
          isError<TokenDetailsResponse>(tokenDetailsResponse)
        ) {
          return genericInvocation;
        }

        const { symbol, decimals } = tokenDetailsResponse!;
        const isNative = symbol === "native";
        const code = isNative ? "XLM" : symbol;
        const formattedTokenAmount = formatTokenAmount(
          new BigNumber(attrs.amount),
          decimals,
        );

        // Extract destination from XDR for Soroban transfers (may be muxed)
        // Note: For Soroban, the destination is in contract args, so we use attrs.to as fallback
        const actualDestination = await extractDestinationFromXDR(
          txEnvelopeXdr,
          networkDetails,
          attrs.to || "",
        );

        const isReceiving =
          actualDestination === publicKey && attrs.from !== publicKey;
        const paymentDifference = isReceiving ? "+" : "-";
        const formattedAmount = `${paymentDifference}${formattedTokenAmount} ${code}`;

        return {
          action: isReceiving ? "Received" : "Sent",
          actionIcon: isReceiving ? "received" : "sent",
          amount: formattedAmount,
          date,
          id,
          metadata: {
            ...baseMetadata,
            destAssetCode: code,
            isInvokeHostFn,
            isTokenTransfer: true,
            nonLabelAmount: formattedTokenAmount,
            to: actualDestination,
          },
          rowIcon: getTransferIcons({ isNative, isReceiving }),
          rowText: code,
        };
      } catch (error) {
        return genericInvocation;
      }
    }

    return genericInvocation;
  }

  switch (operation.type) {
    case Horizon.HorizonApi.OperationResponseType.createAccount: {
      // If you're not creating an external account then this means you're
      // receiving some XLM to create(fund) your own account
      const isReceiving = !isCreateExternalAccount;

      // Extract destination from XDR for createAccount (may be muxed if sent to muxed address)
      const actualDestination = await extractDestinationFromXDR(
        txEnvelopeXdr,
        networkDetails,
        account || "",
      );

      const paymentDifference = isReceiving ? "+" : "-";
      const nonLabelAmount = formatAmount(
        new BigNumber(startingBalance!).toString(),
      );
      const formattedAmount = `${paymentDifference}${nonLabelAmount} ${destAssetCode}`;

      return {
        action: isReceiving ? i18n.t("Received") : i18n.t("Sent"),
        actionIcon: isReceiving ? "received" : "sent",
        amount: formattedAmount,
        date,
        id,
        metadata: {
          ...baseMetadata,
          isReceiving,
          nonLabelAmount,
          to: actualDestination,
          from,
        },
        rowIcon: (
          <div className="HistoryItem__icon__bordered">
            <Icon.User01 />
            <div className="HistoryItem__icon__small HistoryItem--create-account">
              {/* When you've received XLM to create your own account */}
              {isReceiving && <Icon.Plus />}
              {/* When you've sent XLM to create external account */}
              {!isReceiving && <Icon.ArrowUp />}
            </div>
          </div>
        ),
        rowText: i18n.t("Create Account"),
      };
    }

    case Horizon.HorizonApi.OperationResponseType.changeTrust: {
      const destIcon = await getIconUrl({
        key: assetIssuer || "",
        code: destAssetCode || "",
        networkDetails,
        homeDomains,
        icons,
      });

      return {
        action: operation.limit === "0.0000000" ? "Removed" : "Added",
        actionIcon: operation.limit === "0.0000000" ? "remove" : "add",
        amount: null,
        date,
        id,
        metadata: {
          ...baseMetadata,
          destAssetCode,
        },
        rowIcon: destIcon ? (
          <AssetSds
            size="lg"
            variant="single"
            sourceOne={{
              altText: i18n.t("Asset logo"),
              image: destIcon,
            }}
          />
        ) : (
          renderIconPlaceholder(destAssetCode)
        ),
        rowText:
          operation.limit === "0.0000000"
            ? "Remove trustline"
            : "Add trustline",
      };
    }

    default: {
      return {
        action: null,
        actionIcon: "generic",
        amount: null,
        date,
        id,
        metadata: {
          ...baseMetadata,
        },
        rowIcon: getRowIconByType("generic"),
        rowText: operationString,
      };
    }
  }
};

/**
 * Fetches home domains for asset issuers that are needed for displaying operation icons.
 *
 * This function analyzes a list of Horizon operations to identify asset issuers that require
 * home domains for icon display. It only processes operations that need icons (payments, swaps,
 * and changeTrust operations). For each relevant operation, it checks if the asset issuer's
 * home domain is already cached. If not, it adds the issuer to a list of domains to fetch.
 * After collecting all missing domains, it fetches them in a single batch and updates the
 * homeDomains cache object.
 *
 * @param {HorizonOperation[]} operations - Array of Horizon operations to analyze
 * @param {NetworkDetails} networkDetails - Network configuration details
 * @param {{ [assetIssuer: string]: string | null }} homeDomains - Cache object mapping asset issuer keys to their home domains
 * @returns {Promise<{ [assetIssuer: string]: string | null }>} The updated homeDomains object with newly fetched domains
 */
export const getHomeDomainsForOperations = async (
  operations: HorizonOperation[],
  networkDetails: NetworkDetails,
  homeDomains: { [assetIssuer: string]: string | null },
) => {
  const domainsToFetch = new Set<string>();
  for (const operation of operations) {
    const { asset_issuer: assetIssuer } = operation;
    const sourceAssetIssuer =
      "source_asset_issuer" in operation ? operation.source_asset_issuer : "";
    const isPayment = getIsPayment(operation.type);
    const isSwap = getIsSwap(operation);

    const isIconNeeded =
      isPayment ||
      isSwap ||
      operation.type === Horizon.HorizonApi.OperationResponseType.changeTrust;
    if (isIconNeeded) {
      if (assetIssuer && !homeDomains[assetIssuer]) {
        domainsToFetch.add(assetIssuer);
      }
      if (sourceAssetIssuer && !homeDomains[sourceAssetIssuer]) {
        domainsToFetch.add(sourceAssetIssuer);
      }
    }
  }

  const domainsArr = Array.from(domainsToFetch);
  if (domainsArr.length > 0) {
    const newDomains = await getAssetDomains({
      assetIssuerDomainsToFetch: domainsArr,
      networkDetails,
    });

    Object.entries(newDomains).forEach(([key, value]) => {
      homeDomains[key] = value;
    });
  }

  return homeDomains;
};

const createHistorySections = async (
  publicKey: string,
  operations: HorizonOperation[],
  balances: AssetType[],
  icons: AssetIcons,
  networkDetails: NetworkDetails,
  isHideDustEnabled: boolean,
  fetchTokenDetails: (args: {
    contractId: string;
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => Promise<TokenDetailsResponse | Error>,
  homeDomains: { [assetIssuer: string]: string | null },
) => {
  /* 
    To prevent multiple requests for home domains as we build each row, 
    we iterate through the operations and collect the asset issuers that need home domains in a single request.
  */
  const fetchedHomeDomains = await getHomeDomainsForOperations(
    operations,
    networkDetails,
    homeDomains,
  );
  return operations.reduce(
    async (
      sectionsPromise: Promise<HistorySection[]>,
      operation: HorizonOperation,
    ) => {
      const sections = await sectionsPromise;

      const isPayment = getIsPayment(operation.type);
      const isSwap = getIsSwap(operation);
      const isCreateExternalAccount =
        operation.type ===
          Horizon.HorizonApi.OperationResponseType.createAccount &&
        operation.account !== publicKey;
      const isDustPayment = getIsDustPayment(publicKey, operation);

      const parsedOperation = {
        ...operation,
        isPayment,
        isSwap,
        isDustPayment,
        isCreateExternalAccount,
      };

      const rowData = await getRowDataByOpType(
        publicKey,
        balances,
        parsedOperation,
        networkDetails,
        icons,
        fetchTokenDetails,
        fetchedHomeDomains,
      );

      if (isDustPayment && isHideDustEnabled) {
        return sections;
      }

      if (getIsCreateClaimableBalanceSpam(operation)) {
        return sections;
      }

      const date = new Date(operation.created_at);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthYear = `${month}:${year}`;

      const lastSection = sections.length > 0 && sections[sections.length - 1];

      // if we have no sections yet, let's create the first one
      if (!lastSection) {
        return [{ monthYear, operations: [rowData] }];
      }

      // if element belongs to this section let's add it right away
      if (lastSection.monthYear === monthYear) {
        lastSection.operations.push(rowData);
        return sections;
      }

      // otherwise let's add a new section at the bottom of the array
      return [...sections, { monthYear, operations: [rowData] }];
    },
    Promise.resolve([] as HistorySection[]),
  );
};

interface ResolvedData {
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  history: HistorySection[];
  publicKey: string;
  applicationState: APPLICATION_STATE;
}

type HistoryData = ResolvedData | NeedsReRoute;

function useGetHistoryData(
  balanceOptions: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  historyOptions: {
    isHideDustEnabled: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<HistoryData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  const { fetchData: fetchHistory } = useGetHistory();
  const { fetchData: fetchTokenDetails } = useTokenDetails();
  const homeDomains = useSelector(homeDomainsSelector);
  const reduxDispatch = useDispatch<AppDispatch>();

  const fetchData = async (
    useBalancesCache = false,
    useHistoryCache = false,
  ) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        useBalancesCache,
      );
      const history = await fetchHistory(
        publicKey,
        networkDetails,
        useHistoryCache,
      );

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const cachedHomeDomains = { ...homeDomains[networkDetails.network] } as {
        [assetIssuer: string]: string | null;
      };

      const cachedIcons = { ...(balancesResult.icons || {}) };

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        balances: balancesResult,
        applicationState: appData.account.applicationState,
        history: await createHistorySections(
          publicKey,
          history,
          balancesResult.balances,
          cachedIcons,
          networkDetails,
          historyOptions.isHideDustEnabled,
          fetchTokenDetails,
          cachedHomeDomains,
        ),
      } as ResolvedData;

      // If we found new home domains and icons during iteration, save them to the cache
      reduxDispatch(
        saveDomainForIssuer({ networkDetails, homeDomains: cachedHomeDomains }),
      );
      reduxDispatch(saveIconsForBalances({ icons: cachedIcons }));
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetHistoryData };
