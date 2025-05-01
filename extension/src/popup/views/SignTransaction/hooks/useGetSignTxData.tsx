import { useReducer, useState } from "react";

import { Account, BlockAidScanTxResult } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useScanTx } from "popup/helpers/blockaid";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { NetworkDetails } from "@shared/constants/stellar";
import { makeAccountActive } from "popup/ducks/accountServices";
import { useDispatch } from "react-redux";
import { AppDispatch } from "popup/App";

interface ResolvedData {
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
      );

      const scanResult = await scanTx(
        scanOptions.xdr,
        scanOptions.url,
        networkDetails,
      );

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      // handle auto selecting the right account based on `accountToSign`
      let currentAccount = allAccounts.find(
        (account) => account.publicKey === publicKey,
      );
      allAccounts.forEach((account) => {
        if (accountToSign) {
          // does the user have the `accountToSign` somewhere in the accounts list?
          if (account.publicKey === accountToSign) {
            // if the `accountToSign` is found, but it isn't active, make it active
            if (publicKey !== account.publicKey) {
              reduxDispatch(makeAccountActive(account.publicKey));
            }

            // save the details of the `accountToSign`
            currentAccount = account;
          }
        }
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
