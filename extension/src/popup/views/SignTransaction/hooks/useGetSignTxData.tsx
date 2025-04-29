import { useReducer } from "react";

import { BlockAidScanTxResult } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useScanTx } from "popup/helpers/blockaid";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";
import { rejectTransaction, signTransaction } from "popup/ducks/access";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { NetworkDetails } from "@shared/constants/stellar";

interface ResolvedData {
  type: AppDataType.RESOLVED;
  scanResult: BlockAidScanTxResult | null;
  balances: AccountBalances;
  publicKey: string;
  signFlowState: ReturnType<typeof useSetupSigningFlow>;
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

  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  const { scanTx } = useScanTx();
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
  } = useSetupSigningFlow(rejectTransaction, signTransaction, scanOptions.xdr);

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

      setAccountDetails({ publicKey, allAccounts, accountToSign });

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
