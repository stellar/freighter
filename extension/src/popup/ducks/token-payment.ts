import { Address, SorobanRpc, XdrLargeInt } from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ActionStatus, ErrorMessage } from "@shared/api/types";
import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import { transfer } from "@shared/helpers/soroban/token";
import { isCustomNetwork, xlmToStroop } from "helpers/stellar";
import { SorobanContextInterface } from "popup/SorobanContext";

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
    sorobanClient: SorobanContextInterface;
    transactionFee: string;
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "simulateTokenPayment",
  async (
    {
      address,
      publicKey,
      memo,
      params,
      networkDetails,
      sorobanClient,
      transactionFee,
    },
    thunkApi,
  ) => {
    try {
      if (isCustomNetwork(networkDetails)) {
        const builder = await sorobanClient.newTxBuilder(
          xlmToStroop(transactionFee).toFixed(),
        );

        const transferParams = [
          new Address(publicKey).toScVal(), // from
          new Address(address).toScVal(), // to
          new XdrLargeInt("i128", params.amount).toI128(), // amount
        ];
        const transaction = transfer(address, transferParams, memo, builder);
        const simulationResponse = await sorobanClient.server.simulateTransaction(
          transaction,
        );

        const preparedTransaction = SorobanRpc.assembleTransaction(
          transaction,
          simulationResponse,
        )
          .build()
          .toXDR();

        return {
          simulationResponse,
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
      return response;
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
