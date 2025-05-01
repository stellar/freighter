import { useReducer, useState } from "react";

import { initialState, isError, reducer } from "../../../../helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "../../../../helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { makeAccountActive } from "popup/ducks/accountServices";
import { useDispatch } from "react-redux";
import { Account } from "@shared/api/types";
import { AppDispatch } from "popup/App";

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

type SignAuthEntryData = ResolvedData | NeedsReRoute;

function useGetSignAuthEntryData(accountToSign?: string) {
  const [state, dispatch] = useReducer(
    reducer<SignAuthEntryData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const { fetchData: fetchAppData } = useGetAppData();
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

export { useGetSignAuthEntryData };
