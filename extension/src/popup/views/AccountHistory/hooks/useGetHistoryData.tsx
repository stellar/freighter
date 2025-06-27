import React, { useReducer } from "react";
import { Horizon } from "stellar-sdk";
import { camelCase } from "lodash";
import BigNumber from "bignumber.js";
import {
  Asset as AssetSds,
  Icon,
  Text,
  TextProps,
} from "@stellar/design-system";

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
import { isMainnet } from "helpers/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { HorizonOperation } from "@shared/api/types";
import { OPERATION_TYPES } from "constants/transaction";
import { formatAmount } from "popup/helpers/formatters";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { NetworkDetails } from "@shared/constants/stellar";

export type HistorySection = {
  monthYear: string; // in format {month}:{year}
  operations: HistoryItemOperation[];
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
              altText: "Swap source token logo",
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
              altText: "Swap destination token logo",
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
  destIcon: string;
}) => {
  return destIcon ? (
    <AssetSds
      size="lg"
      variant="single"
      sourceOne={{
        altText: "Payment token logo",
        image: destIcon,
      }}
    />
  ) : (
    renderIconPlaceholder(destAssetCode)
  );
};

export const getRowIconByType = (iconType: string) => {
  switch (iconType) {
    case "fail": {
      return <Icon.Wallet03 />;
    }
    case "generic": {
      return <Icon.User01 />;
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

export const getRowDataByOpType = async (
  publicKey: string,
  operation: HistoryItemOperation,
  networkDetails: NetworkDetails,
) => {
  const {
    // account,
    amount,
    asset_code: assetCode,
    asset_issuer: assetIssuer,
    created_at: createdAt,
    // id,
    to,
    from,
    starting_balance: startingBalance,
    type,
    type_i: typeI,
    transaction_attr: { operation_count: operationCount },
    isCreateExternalAccount = false,
    isPayment = false,
    isSwap = false,
    transaction_successful: transactionSuccessful,
    // transaction_hash: txHash,
  } = operation;
  const isInvokeHostFn = typeI === 24;

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

  if (transactionSuccessful) {
    return {
      action: "Failed",
      actionIcon: "failed",
      amount: null,
      date,
      rowIcon: "fail",
      rowText: "Transaction Failed",
    };
  }

  const sourceAssetCode =
    "source_asset_code" in operation ? operation.source_asset_code : "";
  const sourceAssetIssuer =
    "source_asset_issuer" in operation ? operation.source_asset_issuer : "";
  const srcAssetCode = sourceAssetCode || "XLM";
  const destAssetCode = assetCode || "XLM";

  if (isSwap) {
    const formattedAmount = `${formatAmount(
      new BigNumber(amount!).toString(),
    )} ${destAssetCode}`;

    const destIcon =
      destAssetCode === "XLM"
        ? StellarLogo
        : await getIconUrlFromIssuer({
            key: assetIssuer || "",
            code: destAssetCode || "",
            networkDetails,
          });
    const sourceIcon =
      srcAssetCode === "XLM"
        ? StellarLogo
        : await getIconUrlFromIssuer({
            key: sourceAssetIssuer || "",
            code: srcAssetCode || "",
            networkDetails,
          });

    return {
      action: "Swapped",
      actionIcon: "swap",
      amount: formattedAmount,
      date,
      metadata: {
        destAssetCode,
        destIcon,
        sourceIcon,
        srcAssetCode,
      },
      rowIcon: null,
      rowText: null,
    };
  }

  if (isPayment) {
    // default to Sent if a payment to self
    const isReceiving = to === publicKey && from !== publicKey;
    const paymentDifference = isReceiving ? "+" : "-";
    const formattedAmount = `${paymentDifference}${formatAmount(
      new BigNumber(amount!).toString(),
    )} ${destAssetCode}`;
    const destIcon =
      destAssetCode === "XLM"
        ? StellarLogo
        : await getIconUrlFromIssuer({
            key: assetIssuer || "",
            code: destAssetCode || "",
            networkDetails,
          });

    return {
      action: isReceiving ? "Received" : "Sent",
      actionIcon: isReceiving ? "received" : "sent",
      amount: formattedAmount,
      date,
      rowIcon: null,
      metadata: {
        destIcon,
      },
      rowText: destAssetCode,
    };
  }

  if (isInvokeHostFn) {
    //
  }

  switch (operation.type) {
    case Horizon.HorizonApi.OperationResponseType.createAccount: {
      // If you're not creating an external account then this means you're
      // receiving some XLM to create(fund) your own account
      const isReceiving = !isCreateExternalAccount;
      const paymentDifference = isReceiving ? "+" : "-";
      const formattedAmount = `${paymentDifference}${formatAmount(
        new BigNumber(startingBalance!).toString(),
      )} ${destAssetCode}`;

      return {
        action: `${isReceiving ? "Received" : "Sent"}`,
        actionIcon: isReceiving ? "received" : "sent",
        amount: formattedAmount,
        date,
        rowIcon: "generic",
        rowText: "Create Account",
      };
    }

    case Horizon.HorizonApi.OperationResponseType.changeTrust: {
      const destIcon = await getIconUrlFromIssuer({
        key: assetIssuer || "",
        code: destAssetCode || "",
        networkDetails,
      });
      const formattedAmount = `${formatAmount(
        new BigNumber(amount!).toString(),
      )} ${destAssetCode}`;

      return {
        action: operation.limit === "0.0000000" ? "Removed" : "Added",
        actionIcon: operation.limit === "0.0000000" ? "remove" : "add",
        amount: formattedAmount,
        date,
        rowIcon: destIcon ? (
          <AssetSds
            size="lg"
            variant="single"
            sourceOne={{
              altText: "Asset logo",
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
        rowIcon: "generic",
        rowText: operationString,
      };
    }
  }
};

const createHistorySections = (
  publicKey: string,
  operations: HorizonOperation[],
  isHideDustEnabled: boolean,
) =>
  operations.reduce(
    (sections: HistorySection[], operation: HorizonOperation) => {
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
        isCreateExternalAccount,
      };

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
        return [{ monthYear, operations: [parsedOperation] }];
      }

      // if element belongs to this section let's add it right away
      if (lastSection.monthYear === monthYear) {
        lastSection.operations.push(parsedOperation);
        return sections;
      }

      // otherwise let's add a new section at the bottom of the array
      return [...sections, { monthYear, operations: [parsedOperation] }];
    },
    [] as HistorySection[],
  );

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

  const fetchData = async () => {
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
      );
      const history = await fetchHistory(publicKey, networkDetails);

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        balances: balancesResult,
        applicationState: appData.account.applicationState,
        history: createHistorySections(
          publicKey,
          history,
          historyOptions.isHideDustEnabled,
        ),
      } as ResolvedData;
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
