import { useReducer } from "react";
import { BASE_FEE, SorobanRpc } from "stellar-sdk";
import BigNumber from "bignumber.js";
import { useDispatch } from "react-redux";

import { NetworkDetails } from "@shared/constants/stellar";

import { initialState, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { buildAndSimulateSoroswapTx } from "popup/helpers/sorobanSwap";
import { stroopToXlm } from "helpers/stellar";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
  parseTokenAmount,
} from "popup/helpers/soroban";
import { simulateTokenTransfer } from "@shared/api/internal";
import { TokenBalance } from "@shared/api/types";
import { saveTransactionFee } from "popup/ducks/transactionSubmission";

type Mode = "Soroswap" | "TokenPayment" | "ClassicPayment";

interface GetSettingsData {
  simulationResponse?: {
    preparedTransaction: string;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  };
  recommendedFee: string;
  balances: AccountBalances;
}

const simulateTx = async ({
  mode,
  options,
  recommendedFee,
}: {
  mode: Mode;
  recommendedFee: string;
  options: {
    soroswap: {
      amountIn: string;
      amountInDecimals: number;
      amountOut: string;
      amountOutDecimals: number;
      memo?: string;
      transactionFee: string;
      path: string[];
      networkDetails: NetworkDetails;
      publicKey: string;
    };
    tokenPayment: {
      address: string;
      publicKey: string;
      memo?: string;
      params: {
        publicKey: string;
        destination: string;
        amount: number;
      };
      networkDetails: NetworkDetails;
      transactionFee: string;
    };
  };
}) => {
  const baseFee = new BigNumber(recommendedFee || stroopToXlm(BASE_FEE));

  switch (mode) {
    case "Soroswap": {
      const {
        amountIn,
        amountInDecimals,
        amountOut,
        amountOutDecimals,
        memo,
        transactionFee,
        path,
        networkDetails,
        publicKey,
      } = options.soroswap;
      const simulationResponse = await buildAndSimulateSoroswapTx({
        networkDetails,
        publicKey,
        amountIn,
        amountInDecimals,
        amountOut,
        amountOutDecimals,
        memo,
        transactionFee,
        path,
      });
      const minResourceFee = formatTokenAmount(
        new BigNumber(
          simulationResponse.simulationTransaction.minResourceFee as string,
        ),
        CLASSIC_ASSET_DECIMALS,
      );
      return {
        payload: simulationResponse,
        recommendedFee: baseFee.plus(new BigNumber(minResourceFee)).toString(),
      };
    }

    case "TokenPayment": {
      const {
        address,
        publicKey,
        memo,
        params,
        networkDetails,
        transactionFee,
      } = options.tokenPayment;
      const { ok, response } = await simulateTokenTransfer({
        address,
        publicKey,
        memo,
        params,
        networkDetails,
        transactionFee,
      });

      if (!ok) {
        throw new Error("failed to simulate token transfer");
      }

      const minResourceFee = formatTokenAmount(
        new BigNumber(response.simulationTransaction.minResourceFee),
        CLASSIC_ASSET_DECIMALS,
      );
      return {
        payload: response,
        recommendedFee: baseFee.plus(new BigNumber(minResourceFee)).toString(),
      };
    }

    case "ClassicPayment": {
      return {
        recommendedFee: baseFee.toString(),
      };
    }

    default:
      throw new Error("mode not supported");
  }
};

function useGetSettingsData(
  publicKey: string,
  networkDetails: NetworkDetails,
  mode: Mode,
  recommendedFee: string,
  balanceOptions: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
  soroswapParameters: {
    amountIn: string;
    amountInDecimals: number;
    amountOut: string;
    amountOutDecimals: number;
    memo?: string;
    transactionFee: string;
    path: string[];
  },
  tokenPaymentParameters: {
    address: string;
    amount: string;
    publicKey: string;
    memo?: string;
    params: {
      asset: string;
      publicKey: string;
      destination: string;
    };
    networkDetails: NetworkDetails;
    transactionFee: string;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<GetSettingsData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    balanceOptions,
  );
  const reduxDispatch = useDispatch();

  const fetchData = async (): Promise<GetSettingsData | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balancesResult = await fetchBalances();

      // TODO: make type narrow functions
      if (!("balances" in balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const { address, amount, memo, params, transactionFee } =
        tokenPaymentParameters;

      const isXlm = address === "native";
      const assetBalance = balancesResult.balances.find((balance) => {
        if (isXlm) {
          return (
            balance.token &&
            "type" in balance.token &&
            balance.token.type === "native"
          );
        }
        // TODO: check for classic assets

        return balance.contractId === address;
      }) as TokenBalance;
      if (!assetBalance) {
        throw new Error("asset balance not found");
      }

      // TODO: check send to sac amount
      const parsedAmount = parseTokenAmount(
        amount,
        Number(isXlm ? 7 : assetBalance.decimals),
      );
      const simResponse = await simulateTx({
        mode,
        recommendedFee,
        options: {
          soroswap: {
            ...soroswapParameters,
            publicKey,
            networkDetails,
          },
          tokenPayment: {
            address,
            publicKey,
            memo,
            params: {
              ...params,
              amount: parsedAmount.toNumber(),
            },
            networkDetails,
            transactionFee,
          },
        },
      });

      const payload = {
        balances: balancesResult,
        ...simResponse,
      } as GetSettingsData;
      // some flows still use transaction fee from the store
      reduxDispatch(saveTransactionFee(payload.recommendedFee));
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return new Error(JSON.stringify(error));
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetSettingsData };
