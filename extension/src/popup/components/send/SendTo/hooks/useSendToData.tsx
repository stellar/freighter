import { useReducer, useRef } from "react";
import { Federation, StrKey } from "stellar-sdk";
import { FormikErrors } from "formik";
import debounce from "lodash/debounce";
import { captureException } from "@sentry/browser";
import i18n from "popup/helpers/localizationConfig";
import { FederationMemoType } from "popup/helpers/federationMemo";
import { resolveSorobanDomain } from "popup/helpers/sorobanDomains";

import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { loadRecentAddresses } from "@shared/api/internal";
import { getBaseAccount } from "popup/helpers/account";
import {
  isFederationAddress,
  isMainnet,
  isSameAccount,
  isSorobanDomain,
} from "helpers/stellar";
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
  domainAddress: string;
  federationMemo: string;
  federationMemoType: FederationMemoType | "";
  applicationState: APPLICATION_STATE;
  publicKey: string;
  networkDetails: NetworkDetails;
}

type SendToData = NeedsReRoute | ResolvedSendToData;

export const getAddressFromInput = async (
  userInput: string,
  networkDetails: NetworkDetails,
) => {
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
      domainAddress: "",
      federationMemo: memo,
      federationMemoType: memoType,
    };
  }

  if (isSorobanDomain(userInput)) {
    if (!isMainnet(networkDetails)) {
      throw new Error(i18n.t("Soroban Domains is only available on Mainnet"));
    }

    const { address, domain } = await resolveSorobanDomain(
      userInput,
      networkDetails,
    );

    return {
      validatedAddress: address,
      fedAddress: "",
      domainAddress: domain,
      federationMemo: "",
      federationMemoType: "" as const,
    };
  }

  return {
    validatedAddress: userInput,
    fedAddress: "",
    domainAddress: "",
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
  // Domain/federation resolution is async and can be slow (RPC round-trip).
  // A fast typist can trigger a newer fetch before an older one settles; this
  // guard stops the older one's dispatch from overwriting the newer state.
  // getAddressFromInput/loadRecentAddresses/fetchBalances don't accept an
  // AbortSignal, so this can't cancel the underlying network calls - it only
  // marks a superseded call as stale. Same pattern as useSwapTokenLookup.
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedFetch = debounce(
    async (
      userInput: string,
      publicKey: string,
      applicationState: APPLICATION_STATE,
      networkDetails: NetworkDetails,
      _isMainnet: boolean,
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const {
          validatedAddress,
          fedAddress,
          domainAddress,
          federationMemo,
          federationMemoType,
        } = await getAddressFromInput(userInput, networkDetails);

        if (controller.signal.aborted) {
          return;
        }

        // Block self-sends. isSameAccount resolves muxed (M...) addresses to
        // their base (G...) account, so sending to one of your own muxed
        // addresses is caught too - as is a federation address that resolves to
        // your own account (validatedAddress is the resolved G... here).
        if (isSameAccount(validatedAddress, publicKey)) {
          throw new Error(i18n.t("You cannot send to yourself"));
        }

        const { recentAddresses } = await loadRecentAddresses({
          activePublicKey: publicKey,
        });

        if (controller.signal.aborted) {
          return;
        }

        const payload = {
          type: AppDataType.RESOLVED,
          recentAddresses,
          validatedAddress,
          fedAddress,
          domainAddress,
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

        if (controller.signal.aborted) {
          return;
        }

        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
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
        domainAddress: "",
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
      domainAddress: "",
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
