import { useReducer, useState } from "react";

import { Account, AssetIcons, BlockAidScanTxResult } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useScanTx } from "popup/helpers/blockaid";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { getCanonicalFromAsset, isMainnet } from "helpers/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { NetworkDetails } from "@shared/constants/stellar";
import { makeAccountActive } from "popup/ducks/accountServices";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "popup/App";
import { signFlowAccountSelector } from "popup/helpers/account";
import { iconsSelector, tokensListsSelector } from "popup/ducks/cache";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { isContractId } from "popup/helpers/soroban";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { settingsSelector } from "popup/ducks/settings";
import { TransactionBuilder } from "stellar-sdk";

export interface ResolvedData {
  type: AppDataType.RESOLVED;
  scanResult: BlockAidScanTxResult | null;
  balances: AccountBalances;
  publicKey: string;
  signFlowState: {
    allAccounts: Account[];
    accountNotFound: boolean;
    currentAccount: Account;
  };
  applicationState: APPLICATION_STATE;
  networkDetails: NetworkDetails;
  icons: AssetIcons;
}

type SignTxData = NeedsReRoute | ResolvedData;

function useGetSignTxData(
  scanOptions: {
    xdr: string;
    url: string;
  },
  balanceOptions: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  accountToSign?: string,
) {
  const [state, dispatch] = useReducer(
    reducer<SignTxData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  const cachedIcons = useSelector(iconsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  const { assetsLists } = useSelector(settingsSelector);
  const { scanTx } = useScanTx();
  const [accountNotFound, setAccountNotFound] = useState(false);

  const fetchData = async (newPublicKey?: string) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      if (newPublicKey) {
        await reduxDispatch(makeAccountActive(newPublicKey));
      }
      const appData = await fetchAppData(false);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const allAccounts = appData.account.allAccounts;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        false,
        true,
      );

      // handle auto selecting the right account based on `accountToSign`
      const currentAccount = signFlowAccountSelector({
        allAccounts,
        publicKey,
        accountToSign,
        setActiveAccount: (account: string) =>
          reduxDispatch(makeAccountActive(account)),
      });

      if (!currentAccount) {
        setAccountNotFound(true);
      }

      const scanResult = await scanTx(
        scanOptions.xdr,
        scanOptions.url,
        networkDetails,
      );

      const firstRenderPayload = {
        type: AppDataType.RESOLVED,
        balances: balancesResult,
        scanResult,
        publicKey,
        applicationState: appData.account.applicationState,
        networkDetails: appData.settings.networkDetails,
        signFlowState: {
          allAccounts,
          accountNotFound,
          currentAccount,
        },
      } as ResolvedData;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload: firstRenderPayload });

      // Add all icons needed for tx assets
      const icons = {} as { [code: string]: string };
      // Initialize with cached lists, but we'll fetch fresh data when needed for icon lookups
      let assetsListsData: AssetListResponse[] = cachedTokenLists || [];
      let hasFetchedAssetLists = false;

      // Fetch icons for asset diffs only if includeIcons is true
      if (
        balanceOptions.includeIcons &&
        scanResult &&
        "simulation" in scanResult &&
        scanResult.simulation &&
        scanResult.simulation.status === "Success" &&
        "assets_diffs" in scanResult.simulation
      ) {
        const diffs = scanResult.simulation.assets_diffs || {};
        const accountDiffs = diffs[publicKey] || [];
        for (const diff of accountDiffs) {
          if (
            "code" in diff.asset &&
            diff.asset.code &&
            "issuer" in diff.asset &&
            diff.asset.issuer
          ) {
            const key = diff.asset.issuer;
            const code = diff.asset.code;
            let canonical = getCanonicalFromAsset(code, key);
            const cachedIcon = cachedIcons[canonical];
            if (cachedIcon) {
              icons[canonical] = cachedIcon;
            } else {
              let icon: string | null = await getIconUrlFromIssuer({
                key,
                code,
                networkDetails,
              });
              if (!icon) {
                if (!hasFetchedAssetLists) {
                  assetsListsData = await getCombinedAssetListData({
                    networkDetails,
                    assetsLists,
                    cachedAssetLists: cachedTokenLists,
                  });
                  hasFetchedAssetLists = true;
                }
                const tokenListIcon = await getIconFromTokenLists({
                  issuerId: key,
                  contractId: isContractId(key) ? key : undefined,
                  code,
                  assetsListsData,
                });
                if (tokenListIcon.icon && tokenListIcon.canonicalAsset) {
                  icon = tokenListIcon.icon;
                  canonical = tokenListIcon.canonicalAsset;
                }
              }
              if (icon) {
                icons[canonical] = icon;
              }
            }
          }
        }
      }

      // Always fetch icons for changeTrust operations (regardless of includeIcons flag)
      const transaction = TransactionBuilder.fromXDR(
        scanOptions.xdr,
        networkDetails.networkPassphrase,
      );
      const trustlineChanges = transaction.operations.filter(
        (op) => op.type === "changeTrust",
      );
      if (trustlineChanges.length) {
        for (const trustChange of trustlineChanges) {
          if ("code" in trustChange.line) {
            const { code, issuer } = trustChange.line;
            let canonical = getCanonicalFromAsset(code, issuer);
            const cachedIcon = cachedIcons[canonical];
            if (cachedIcon) {
              icons[canonical] = cachedIcon;
            } else {
              let icon: string | null = await getIconUrlFromIssuer({
                key: issuer,
                code,
                networkDetails,
              });
              if (!icon) {
                if (!hasFetchedAssetLists) {
                  assetsListsData = await getCombinedAssetListData({
                    networkDetails,
                    assetsLists,
                    cachedAssetLists: cachedTokenLists,
                  });
                  hasFetchedAssetLists = true;
                }
                const tokenListIcon = await getIconFromTokenLists({
                  issuerId: issuer,
                  contractId: isContractId(issuer) ? issuer : undefined,
                  code,
                  assetsListsData,
                });
                if (tokenListIcon.icon && tokenListIcon.canonicalAsset) {
                  icon = tokenListIcon.icon;
                  canonical = tokenListIcon.canonicalAsset;
                }
              }
              if (icon) {
                icons[canonical] = icon;
              }
            }
          }
        }
      }

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const payload = {
        type: AppDataType.RESOLVED,
        balances: balancesResult,
        scanResult,
        publicKey,
        applicationState: appData.account.applicationState,
        networkDetails: appData.settings.networkDetails,
        icons,
        signFlowState: {
          allAccounts,
          accountNotFound,
          currentAccount,
        },
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

export { useGetSignTxData };
