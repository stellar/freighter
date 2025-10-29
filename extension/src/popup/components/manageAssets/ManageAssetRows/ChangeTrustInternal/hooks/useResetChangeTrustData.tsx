import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { initialState, reducer, isError } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { isMainnet } from "helpers/stellar";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { resetSubmission } from "popup/ducks/transactionSubmission";
import { AppDispatch } from "popup/App";

export interface ResetChangeTrustData {
  status: "success" | "loading";
}

function useResetChangeTrustData() {
  const [state, dispatch] = useReducer(
    reducer<ResetChangeTrustData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: false,
  });

  const resetChangeTrustData = async ({
    isHardwareWallet,
  }: {
    isHardwareWallet: boolean;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });

    reduxDispatch(resetSubmission());
    const balancesResult = await fetchBalances(
      publicKey,
      isMainnet(networkDetails),
      networkDetails,
      false,
    );

    if (isError<AccountBalances>(balancesResult)) {
      // we don't want to throw an error if balances fail to fetch as this doesn't affect the tx submission
      // let's simply log the error and continue - the user will need to refresh the Account page or wait for polling to refresh the balances
      captureException(
        `Failed to fetch balances after change trust ${isHardwareWallet ? "hardware wallet" : ""} tx submission - ${JSON.stringify(
          balancesResult.message,
        )} ${networkDetails.network}`,
      );
    }

    dispatch({ type: "FETCH_DATA_SUCCESS", payload: { status: "success" } });
  };

  return {
    state,
    resetChangeTrustData,
  };
}

export { useResetChangeTrustData };
