import { rpc as SorobanRpc } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { simulateTransaction } from "@shared/api/internal";
import { getBlendPoolId } from "@shared/constants/blend";
import {
  BlendRequestType,
  buildBlendRequestScVal,
  buildBlendSubmitOp,
} from "@shared/helpers/soroban/blend";
import { xlmToStroop } from "helpers/stellar";
import { parseTokenAmount } from "popup/helpers/soroban";
import i18n from "popup/helpers/localizationConfig";

interface BuildAndSimulateBlendDepositParams {
  publicKey: string;
  /** The reserve's asset contract address (a SAC for every current reserve). */
  assetId: string;
  /** Human-readable amount, e.g. "500.00". */
  amount: string;
  decimals: number;
  networkDetails: NetworkDetails;
  /** Inclusion fee in XLM; the resource fee is added by assembleTransaction. */
  transactionFee: string;
  transactionTimeout: number;
}

/**
 * Builds and simulates a Blend deposit — `pool.submit` with one
 * SupplyCollateral request.
 *
 * Returns the prepared (assembled) XDR ready to sign, plus the raw simulation
 * so callers can read `minResourceFee` for the fee breakdown.
 *
 * The account is loaded from Horizon rather than soroban-rpc: the popup cannot
 * reach a mainnet RPC directly, which is why simulation goes through the v1
 * backend's `/simulate-tx` proxy. Same shape as `buildAndSimulateSoroswapTx`.
 */
export const buildAndSimulateBlendDeposit = async ({
  publicKey,
  assetId,
  amount,
  decimals,
  networkDetails,
  transactionFee,
  transactionTimeout,
}: BuildAndSimulateBlendDepositParams): Promise<{
  preparedTransaction: string;
  simulationResponse: SorobanRpc.Api.SimulateTransactionSuccessResponse;
}> => {
  const poolId = getBlendPoolId(networkDetails);
  if (!poolId) {
    throw new Error(i18n.t("Earn is not supported on this network"));
  }

  const Sdk = getSdk(networkDetails.networkPassphrase);
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );
  const account = await server.loadAccount(publicKey);

  const request = buildBlendRequestScVal({
    assetId,
    // Blend takes the amount in the asset's smallest unit. toFixed(0) because
    // an i128 cannot carry a fraction, and exponential notation would not parse.
    amount: parseTokenAmount(amount, decimals).toFixed(0),
    // request_type 2 (SupplyCollateral), not 0 (Supply): the position lands in
    // the pool's `collateral_tokens` rather than `supply_tokens`, so it counts
    // as collateral and the user's borrowing power stays open.
    requestType: BlendRequestType.SupplyCollateral,
    networkPassphrase: networkDetails.networkPassphrase,
  });

  const builtTx = new Sdk.TransactionBuilder(account, {
    // Inclusion fee only — assembleTransaction adds the resource fee on top
    // once simulation reports it.
    fee: xlmToStroop(transactionFee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(
      buildBlendSubmitOp({
        poolId,
        publicKey,
        requests: [request],
        networkPassphrase: networkDetails.networkPassphrase,
      }),
    )
    // A finite timeout, unlike the token-transfer helpers' TimeoutInfinite: a
    // deposit priced against a live APY should expire rather than sit signable.
    .setTimeout(transactionTimeout)
    .build();

  const { ok, response } = await simulateTransaction({
    xdr: builtTx.toXDR(),
    networkDetails,
  });

  if (!ok) {
    throw new Error(
      typeof response === "string" ? response : JSON.stringify(response),
    );
  }

  return {
    preparedTransaction: response.preparedTransaction,
    simulationResponse: response.simulationResponse,
  };
};
