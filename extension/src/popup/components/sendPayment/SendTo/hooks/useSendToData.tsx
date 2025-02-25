import { useReducer } from "react";
import { Federation, MuxedAccount } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";

import { initialState, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getAccountBalances, loadRecentAddresses } from "@shared/api/internal";
import { isFederationAddress, isMuxedAccount } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { sortBalances } from "popup/helpers/account";

interface SendToData {
  recentAddresses: string[];
  destinationBalances?: AccountBalances;
  validatedAddress: string;
  fedAddress: string;
}

const getAddressFromInput = async (userInput: string) => {
  if (isFederationAddress(userInput)) {
    const fedResp = await Federation.Server.resolve(userInput);
    return {
      validatedAddress: fedResp.account_id,
      fedAddress: userInput,
    };
  }
  if (isMuxedAccount(userInput)) {
    const mAccount = MuxedAccount.fromAddress(userInput, "0");
    return {
      validatedAddress: mAccount.baseAccount().accountId(),
      fedAddress: "",
    };
  }

  return {
    validatedAddress: userInput,
    fedAddress: "",
  };
};

function useSendToData(
  networkDetails: NetworkDetails,
  balanceOptions: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<SendToData, unknown>,
    initialState,
  );

  const fetchData = async (userInput: string) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const { validatedAddress, fedAddress } = await getAddressFromInput(
        userInput,
      );

      const { recentAddresses } = await loadRecentAddresses();

      const payload = {
        recentAddresses,
        validatedAddress,
        fedAddress,
      } as SendToData;

      if (!isContractId(validatedAddress)) {
        const data = await getAccountBalances(
          validatedAddress,
          networkDetails,
          balanceOptions.isMainnet,
        );
        payload.destinationBalances = {
          ...data,
          balances: sortBalances(data.balances),
        };
      }

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

export { useSendToData };
