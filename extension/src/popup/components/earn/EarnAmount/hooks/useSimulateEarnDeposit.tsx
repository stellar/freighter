import { useReducer } from "react";
import BigNumber from "bignumber.js";
import { useDispatch } from "react-redux";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import { SimulateTxData } from "types/transactions";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
} from "popup/helpers/soroban";
import { useScanTx } from "popup/helpers/blockaid";
import { buildAndSimulateBlendDeposit } from "popup/helpers/blendDeposit";
import { saveSimulation } from "popup/ducks/transactionSubmission";

const scanUrlstub = "internal";

interface SimulateEarnDepositParams {
  publicKey: string;
  /** The reserve's asset contract address. */
  assetId: string;
  amount: string;
  decimals: number;
  networkDetails: NetworkDetails;
  /** Inclusion fee in XLM. */
  transactionFee: string;
  transactionTimeout: number;
}

/**
 * Builds, simulates and scans a Blend deposit.
 *
 * Returns the same `State<SimulateTxData, string>` shape Send and Swap produce,
 * so the shared FeesPane renders the inclusion/resource breakdown unchanged.
 * The prepared XDR is also written to redux, which is where the submit step
 * reads it from.
 */
export function useSimulateEarnDeposit() {
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, string>,
    initialState,
  );
  const reduxDispatch = useDispatch();
  const { scanTx } = useScanTx();

  const simulate = async (params: SimulateEarnDepositParams) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const { preparedTransaction, simulationResponse } =
        await buildAndSimulateBlendDeposit(params);

      // minResourceFee comes back in stroops; the fee UI works in XLM.
      const resourceFee = formatTokenAmount(
        new BigNumber(simulationResponse.minResourceFee),
        CLASSIC_ASSET_DECIMALS,
      );

      // Scanned on the PREPARED transaction — the thing the user actually
      // signs — not the pre-assembly build.
      const scanResult = await scanTx(
        preparedTransaction,
        // Blockaid's `url` is the originating dApp's URL. An in-wallet deposit
        // has no originating dApp, so use the same stub Send and Swap pass.
        scanUrlstub,
        params.networkDetails,
      );

      reduxDispatch(
        saveSimulation({
          preparedTransaction,
          response: simulationResponse,
        }),
      );

      const payload: SimulateTxData = {
        transactionXdr: preparedTransaction,
        scanResult,
        inclusionFee: params.transactionFee,
        resourceFee,
      };

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      // Surface the pool's own rejection (supply cap, frozen pool, stale
      // oracle) — it is the only signal the user gets about why this deposit
      // will not go through.
      const message = error instanceof Error ? error.message : String(error);
      dispatch({ type: "FETCH_DATA_ERROR", payload: message });
      throw new Error(message);
    }
  };

  return { state, simulate };
}
