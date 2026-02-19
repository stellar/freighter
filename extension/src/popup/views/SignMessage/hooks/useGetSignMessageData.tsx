import { useReducer, useState } from "react";

import { initialState, isError, reducer } from "helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { makeAccountActive } from "popup/ducks/accountServices";
import { useDispatch } from "react-redux";
import { Account, BlockAidScanSiteResult } from "@shared/api/types";
import { AppDispatch } from "popup/App";
import { signFlowAccountSelector } from "popup/helpers/account";
import { useAsyncSiteScan } from "popup/helpers/blockaid";
import { getBlockaidOverrideState } from "@shared/api/internal";

interface ResolvedData {
  type: AppDataType.RESOLVED;
  networkDetails: NetworkDetails;
  publicKey: string;
  signFlowState: {
    allAccounts: Account[];
    accountNotFound: boolean;
    currentAccount: Account;
  };
  applicationState: APPLICATION_STATE;
  scanData: BlockAidScanSiteResult | null;
  blockaidOverrideState: string | null;
}

type SignMessageData = ResolvedData | NeedsReRoute;

function useGetSignMessageData(accountToSign?: string, url?: string) {
  const [state, dispatch] = useReducer(
    reducer<SignMessageData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const { fetchData: fetchAppData } = useGetAppData();
  const { scanSite } = useAsyncSiteScan<SignMessageData>(
    url,
    dispatch,
    (payload, scanData) => ({ ...payload, scanData }),
  );
  const [accountNotFound, setAccountNotFound] = useState(false);

  const fetchData = async (newPublicKey?: string) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      if (newPublicKey) {
        await reduxDispatch(makeAccountActive(newPublicKey));
      }
      const appData = await fetchAppData();
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

      const blockaidOverrideState = (await getBlockaidOverrideState()) ?? null;

      // Initial payload without scanData to avoid blocking UI
      const initialPayload = {
        type: AppDataType.RESOLVED,
        networkDetails,
        publicKey,
        applicationState: appData.account.applicationState,
        signFlowState: {
          allAccounts,
          accountNotFound,
          currentAccount,
        },
        scanData: null as BlockAidScanSiteResult | null,
        blockaidOverrideState,
      } as ResolvedData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: initialPayload });

      // Fetch scan data asynchronously without blocking UI
      scanSite(initialPayload);

      return initialPayload;
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

export { useGetSignMessageData };
