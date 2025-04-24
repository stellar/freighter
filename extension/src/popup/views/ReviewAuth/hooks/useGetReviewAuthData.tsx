import { useReducer } from "react";

import { initialState, isError, reducer } from "helpers/request";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { NetworkDetails } from "@shared/constants/stellar";

interface ReviewAuthData {
  networkDetails: NetworkDetails;
  publicKey: string;
  signFlowState: ReturnType<typeof useSetupSigningFlow>;
}

function useGetReviewAuthData(transactionXdr: string, accountToSign?: string) {
  const [state, dispatch] = useReducer(
    reducer<ReviewAuthData, unknown>,
    initialState,
  );

  const { fetchData: fetchAppData } = useGetAppData();
  const {
    accountNotFound,
    currentAccount,
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    rejectAndClose,
    isHardwareWallet,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
    setAccountDetails,
  } = useSetupSigningFlow(rejectTransaction, signTransaction, transactionXdr);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      const publicKey = appData.account.publicKey;
      const allAccounts = appData.account.allAccounts;
      const networkDetails = appData.settings.networkDetails;
      setAccountDetails({ publicKey, allAccounts, accountToSign });

      const payload = {
        networkDetails,
        publicKey,
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
          setAccountDetails,
        },
      };
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
