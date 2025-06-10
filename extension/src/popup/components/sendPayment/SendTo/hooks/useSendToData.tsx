import { useReducer } from "react";
import { Federation } from "stellar-sdk";
import { FormikErrors } from "formik";
import debounce from "lodash/debounce";
import * as Sentry from "@sentry/browser";

import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { loadRecentAddresses } from "@shared/api/internal";
import { getBaseAccount } from "popup/helpers/account";
import { isFederationAddress, isMainnet } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { NetworkDetails } from "@shared/constants/stellar";

interface ResolvedSendToData {
  type: AppDataType.RESOLVED;
  recentAddresses: string[];
  destinationBalances?: AccountBalances;
  validatedAddress: string;
  fedAddress: string;
  applicationState: APPLICATION_STATE;
  publicKey: string;
  networkDetails: NetworkDetails;
}

type SendToData = NeedsReRoute | ResolvedSendToData;

export const getAddressFromInput = async (userInput: string) => {
  if (isFederationAddress(userInput)) {
    try {
      const fedResp = await Federation.Server.resolve(userInput);
      return {
        validatedAddress: fedResp.account_id,
        fedAddress: userInput,
      };
    } catch (error) {
      Sentry.captureException(`Failed to fetch toml for ${userInput}`);
      throw new Error("Failed to resolve federated address.");
    }
  }

  return {
    validatedAddress: userInput,
    fedAddress: "",
  };
};

function useSendToData() {
  const [state, dispatch] = useReducer(
    reducer<SendToData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });

  const debouncedFetch = debounce(
    async (
      userInput: string,
      publicKey: string,
      applicationState: APPLICATION_STATE,
      networkDetails: NetworkDetails,
      _isMainnet: boolean,
    ) => {
      try {
        const { validatedAddress, fedAddress } =
          await getAddressFromInput(userInput);
        const { recentAddresses } = await loadRecentAddresses({
          activePublicKey: publicKey,
        });

        const payload = {
          type: AppDataType.RESOLVED,
          recentAddresses,
          validatedAddress,
          fedAddress,
          applicationState,
          publicKey,
          networkDetails,
        } as ResolvedSendToData;

        let destinationAccount = await getBaseAccount(validatedAddress);
        if (destinationAccount && !isContractId(destinationAccount)) {
          const destinationBalances = await fetchBalances(
            destinationAccount,
            _isMainnet,
            networkDetails,
            true,
          );
          if (isError<AccountBalances>(destinationBalances)) {
            throw new Error(destinationBalances.message);
          }

          payload.destinationBalances = destinationBalances;
        }

        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      } catch (error) {
        dispatch({ type: "FETCH_DATA_ERROR", payload: error });
        return error;
      }
    },
    2000,
  );

  const fetchData = async (
    userInput: string,
    errors: FormikErrors<{
      destination: string;
    }>,
  ) => {
    dispatch({ type: "FETCH_DATA_START" });
    const appData = await fetchAppData(true);
    if (isError(appData)) {
      throw new Error(appData.message);
    }

    if (appData.type === AppDataType.REROUTE) {
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
      return appData;
    }

    const { publicKey, applicationState } = appData.account;
    const { networkDetails } = appData.settings;
    const _isMainnet = isMainnet(networkDetails);

    if (Object.keys(errors).length !== 0 && userInput) {
      const payload = {
        type: AppDataType.RESOLVED,
        recentAddresses: [],
        validatedAddress: "",
        fedAddress: "",
        applicationState,
        publicKey,
        networkDetails,
      } as ResolvedSendToData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    }

    if (userInput) {
      return debouncedFetch(
        userInput,
        publicKey,
        applicationState,
        networkDetails,
        _isMainnet,
      );
    }
    const { recentAddresses } = await loadRecentAddresses({
      activePublicKey: publicKey,
    });

    const payload = {
      type: AppDataType.RESOLVED,
      recentAddresses,
      validatedAddress: "",
      fedAddress: "",
      applicationState,
      publicKey,
      networkDetails,
    } as ResolvedSendToData;
    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
    return payload;
  };

  return {
    state,
    fetchData,
  };
}

export { useSendToData };
