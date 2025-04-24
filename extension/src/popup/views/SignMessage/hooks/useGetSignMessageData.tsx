import { useReducer } from "react";

import { initialState, isError, reducer } from "helpers/request";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { NetworkDetails } from "@shared/constants/stellar";

interface SignMessageData {
  networkDetails: NetworkDetails;
  signFlowState: ReturnType<typeof useSetupSigningFlow>;
}

function useGetSignMessageData(transactionXdr: string, accountToSign?: string) {
  const [state, dispatch] = useReducer(
    reducer<SignMessageData, unknown>,
    initialState,
  );

  const { fetchData: fetchAppData } = useGetAppData();

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
      } = useSetupSigningFlow(
        rejectTransaction,
        signTransaction,
        transactionXdr,
        publicKey,
        allAccounts,
        accountToSign,
      );

      const payload = {
        networkDetails,
        signFlowState: {
          allAccounts,
          accountNotFound,
          currentAccount,
          isConfirming,
          isPasswordRequired,
          isHardwareWallet,
          publicKey,
          handleApprove,
          hwStatus,
          rejectAndClose,
          setIsPasswordRequired,
          verifyPasswordThenSign,
          hardwareWalletType,
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

export { useGetSignMessageData };
