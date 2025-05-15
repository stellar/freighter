import { useReducer, useState } from "react";

import { initialState, isError, reducer } from "helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { useDispatch } from "react-redux";
import { makeAccountActive } from "popup/ducks/accountServices";
import { Account } from "@shared/api/types";
import { AppDispatch } from "popup/App";
import { signFlowAccountSelector } from "popup/helpers/account";

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
}

type ReviewAuthData = ResolvedData | NeedsReRoute;

function useGetReviewAuthData(accountToSign?: string) {
  const [state, dispatch] = useReducer(
    reducer<ReviewAuthData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const { fetchData: fetchAppData } = useGetAppData();
  const [accountNotFound, setAccountNotFound] = useState(false);

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

      const payload = {
        type: AppDataType.RESOLVED,
        networkDetails,
        publicKey,
        applicationState: appData.account.applicationState,
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

export { useGetReviewAuthData };
