import { useReducer } from "react";
import { Federation, StrKey } from "stellar-sdk";
import { FormikErrors } from "formik";
import debounce from "lodash/debounce";
import { captureException } from "@sentry/browser";
import i18n from "popup/helpers/localizationConfig";
import { FederationMemoType } from "popup/helpers/federationMemo";

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
  federationMemo: string;
  federationMemoType: FederationMemoType | "";
  applicationState: APPLICATION_STATE;
  publicKey: string;
  networkDetails: NetworkDetails;
}

type SendToData = NeedsReRoute | ResolvedSendToData;

export const getAddressFromInput = async (userInput: string) => {
  if (isFederationAddress(userInput)) {
    let fedResp;
    try {
      fedResp = await Federation.Server.resolve(userInput);
    } catch (error) {
      captureException(error);
      throw new Error(i18n.t("Failed to resolve federated address"));
    }

    if (!StrKey.isValidEd25519PublicKey(fedResp.account_id)) {
      throw new Error(i18n.t("Federation server returned an invalid address"));
    }

    const rawMemoType = fedResp.memo_type ?? "";
    const memoType = (Object.values(FederationMemoType) as string[]).includes(
      rawMemoType,
    )
      ? (rawMemoType as FederationMemoType)
      : ("" as const);
    const memo = fedResp.memo != null ? String(fedResp.memo) : "";

    return {
      validatedAddress: fedResp.account_id,
      fedAddress: userInput,
      federationMemo: memo,
      federationMemoType: memoType,
    };
  }

  return {
    validatedAddress: userInput,
    fedAddress: "",
    federationMemo: "",
    federationMemoType: "" as const,
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
        const {
          validatedAddress,
          fedAddress,
          federationMemo,
          federationMemoType,
        } = await getAddressFromInput(userInput);

        const { recentAddresses } = await loadRecentAddresses({
          activePublicKey: publicKey,
        });

        const payload = {
          type: AppDataType.RESOLVED,
          recentAddresses,
          validatedAddress,
          fedAddress,
          federationMemo,
          federationMemoType,
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
    0,
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
        federationMemo: "",
        federationMemoType: "",
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
      federationMemo: "",
      federationMemoType: "",
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
