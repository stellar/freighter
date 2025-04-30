import { useReducer, useState } from "react";

import { initialState, isError, reducer } from "helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
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
  signFlowState: ReturnType<typeof useSetupSigningFlow> & {
    allAccounts: Account[];
    accountNotFound: boolean;
    currentAccount: Account;
  };
  applicationState: APPLICATION_STATE;
}

type SignMessageData = ResolvedData | NeedsReRoute;

function useGetSignMessageData(transactionXdr: string, accountToSign?: string) {
  const [state, dispatch] = useReducer(
    reducer<SignMessageData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const { fetchData: fetchAppData } = useGetAppData();
  const {
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    rejectAndClose,
    isHardwareWallet,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = useSetupSigningFlow(rejectTransaction, signTransaction, transactionXdr);
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
      let currentAccount = {} as Account;

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
          isConfirming,
          isPasswordRequired,
          isHardwareWallet,
          handleApprove,
          hwStatus,
          rejectAndClose,
          setIsPasswordRequired,
          verifyPasswordThenSign,
          hardwareWalletType,
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

export { useGetSignMessageData };
