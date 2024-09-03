import { Address, SorobanRpc, XdrLargeInt } from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ActionStatus, ErrorMessage } from "@shared/api/types";
import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import { SorobanRpcNotSupportedError } from "@shared/constants/errors";
import { transfer } from "@shared/helpers/soroban/token";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { xlmToStroop } from "helpers/stellar";

import {
  buildSorobanServer,
  getNewTxBuilder,
} from "@shared/helpers/soroban/server";
import { buildAndSimulateSoroswapTx } from "popup/helpers/sorobanSwap";

export const simulateTokenPayment = createAsyncThunk<
  {
    preparedTransaction: string;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  },
  {
    address: string;
    publicKey: string;
    memo: string;
    params: {
      publicKey: string;
      destination: string;
      amount: number;
    };
    networkDetails: NetworkDetails;
    transactionFee: string;
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "simulateTokenPayment",
  async (
    { address, publicKey, memo, params, networkDetails, transactionFee },
    thunkApi,
  ) => {
    try {
      if (isCustomNetwork(networkDetails)) {
        if (!networkDetails.sorobanRpcUrl) {
          throw new SorobanRpcNotSupportedError();
        }
        const server = buildSorobanServer(
          networkDetails.sorobanRpcUrl,
          networkDetails.networkPassphrase,
        );
        const builder = await getNewTxBuilder(
          publicKey,
          networkDetails,
          server,
          xlmToStroop(transactionFee).toFixed(),
        );

        const transferParams = [
          new Address(publicKey).toScVal(), // from
          new Address(address).toScVal(), // to
          new XdrLargeInt("i128", params.amount).toI128(), // amount
        ];
        const transaction = transfer(address, transferParams, memo, builder);
        const simulationTransaction = await server.simulateTransaction(
          transaction,
        );

        const preparedTransaction = SorobanRpc.assembleTransaction(
          transaction,
          simulationTransaction,
        )
          .build()
          .toXDR();

        return {
          simulationTransaction,
          preparedTransaction,
        };
      }
      const options = {
        method: "POST",
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          pub_key: publicKey,
          memo,
          params,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          network_url: networkDetails.sorobanRpcUrl,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          network_passphrase: networkDetails.networkPassphrase,
        }),
      };
      const res = await fetch(
        `${INDEXER_URL}/simulate-token-transfer`,
        options,
      );
      const response = await res.json();

      if (!res.ok) {
        return thunkApi.rejectWithValue({
          errorMessage: response.message,
        });
      }
      return {
        preparedTransaction: response.preparedTransaction,
        simulationTransaction: response.simulationResponse,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }
  },
);

export const simulateSwap = createAsyncThunk<
  {
    preparedTransaction: string;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  },
  {
    networkDetails: NetworkDetails;
    publicKey: string;
    amountIn: string;
    amountInDecimals: number;
    amountOut: string;
    amountOutDecimals: number;
    memo: string;
    transactionFee: string;
    path: string[];
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "simulateSwap",
  async (
    {
      networkDetails,
      publicKey,
      amountIn,
      amountInDecimals,
      amountOut,
      amountOutDecimals,
      memo,
      transactionFee,
      path,
    },
    thunkApi,
  ) => {
    try {
      const sim = await buildAndSimulateSoroswapTx({
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

      return sim;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }
  },
);

interface InitialState {
  error: ErrorMessage | undefined;
  simulation: {
    preparedTransaction: string | null;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse | null;
  };
  simStatus: ActionStatus;
}

export const initialState: InitialState = {
  error: undefined,
  simulation: {
    preparedTransaction: null,
    simulationTransaction: null,
  },
  simStatus: ActionStatus.IDLE,
};

const tokenPaymentsSimulationSlice = createSlice({
  name: "tokenPaymentSimulation",
  initialState,
  reducers: {
    resetSimulation: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(simulateTokenPayment.pending, (state) => {
      state.simStatus = ActionStatus.PENDING;
    });
    builder.addCase(simulateTokenPayment.rejected, (state, action) => {
      state.simStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(simulateTokenPayment.fulfilled, (state, action) => {
      state.simStatus = ActionStatus.SUCCESS;
      state.simulation = action.payload;
    });
    builder.addCase(simulateSwap.pending, (state) => {
      state.simStatus = ActionStatus.PENDING;
    });
    builder.addCase(simulateSwap.rejected, (state, action) => {
      state.simStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(simulateSwap.fulfilled, (state, action) => {
      state.simStatus = ActionStatus.SUCCESS;
      state.simulation = action.payload;
    });
  },
});

export const { resetSimulation } = tokenPaymentsSimulationSlice.actions;
export const { reducer } = tokenPaymentsSimulationSlice;

export const tokenSimulationSelector = (state: {
  tokenPaymentSimulation: InitialState;
}) => state.tokenPaymentSimulation;

export const tokenSimulationStatusSelector = (state: {
  tokenPaymentSimulation: InitialState;
}) => state.tokenPaymentSimulation.simStatus;

export const tokenSimulationErrorSelector = (state: {
  tokenPaymentSimulation: InitialState;
}) => state.tokenPaymentSimulation.error;
