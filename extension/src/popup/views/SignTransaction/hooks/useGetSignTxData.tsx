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
import { iconsSelector } from "popup/ducks/cache";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { isContractId } from "popup/helpers/soroban";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { settingsSelector } from "popup/ducks/settings";

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
  const { assetsLists } = useSelector(settingsSelector);
  const { scanTx } = useScanTx();
  const [accountNotFound, setAccountNotFound] = useState(false);
  console.log(scanTx, scanOptions);

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
      );

      const scanResult = await scanTx(
        scanOptions.xdr,
        scanOptions.url,
        networkDetails,
      );

      const icons = {} as { [code: string]: string };
      if (
        scanResult &&
        "simulation" in scanResult &&
        scanResult.simulation &&
        scanResult.simulation.status === "Success" &&
        "asset_diffs" in scanResult.simulation
      ) {
        const assetsListsData = await getCombinedAssetListData({
          networkDetails,
          assetsLists,
        });
        const diffs = scanResult.simulation.assets_diffs || {};
        for (const diff of diffs[publicKey]) {
          if (
            "code" in diff.asset &&
            diff.asset.code &&
            "issuer" in diff.asset &&
            diff.asset.issuer
          ) {
            const key = diff.asset.issuer;
            const code = diff.asset.code;
            let canonical = getCanonicalFromAsset(code, key);
            if (cachedIcons[canonical]) {
              icons[canonical] = cachedIcons[canonical];
            } else {
              let icon = await getIconUrlFromIssuer({
                key,
                code,
                networkDetails,
              });
              if (!icon) {
                const tokenListIcon = await getIconFromTokenLists({
                  networkDetails,
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
              icons[canonical] = icon;
            }
          }
        }
      }

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

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
