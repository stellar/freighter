import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";
import BigNumber from "bignumber.js";

import { initialState, reducer, isError } from "helpers/request";
import { AppDispatch } from "popup/App";
import {
  addRecentAddress,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetCollectibles } from "helpers/hooks/useGetCollectibles";
import { NetworkDetails } from "@shared/constants/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMainnet,
} from "helpers/stellar";
import { getSdk, isCustomNetwork } from "@shared/helpers/stellar";
import { AssetIcons } from "@shared/api/types";
import { allAccountsSelector } from "popup/ducks/accountServices";
import { balancesSelector, tokenPricesSelector } from "popup/ducks/cache";
import { tokenPricesV2Selector } from "popup/ducks/remoteConfig";
import { getResultCodes } from "popup/helpers/parseTransaction";
import {
  classifyAssetIdentity,
  computeExecutionSlippagePct,
  computeUsdSlippagePct,
  deriveLegUsd,
  getFailureCategory,
  LegUsdResult,
  LegUsdStatus,
} from "helpers/usdVolume";
import {
  ConfirmationPriceSnapshot,
  ConfirmationSnapshotHandle,
  startConfirmationPriceSnapshot,
} from "helpers/confirmationPriceSnapshot";
import {
  findPathPaymentStrictSendIndex,
  getSettledPathPaymentStrictSendAmount,
} from "helpers/transactionResult";

interface SubmitTxData {
  status: "success" | "error";
  icons: AssetIcons;
  error?: string;
}

/**
 * The `amount_usd`-family properties are named identically on all four
 * terminal events so `SUM(amount_usd)` works across event names.
 * Everything else about a leg (its identity, its token amount) is named
 * differently per event (`asset_*`/`amount` for payment, `from_asset_*`/
 * `from_amount` for swap) and is added by each call site instead.
 */
const buildSourceLegUsdProps = (
  tokenAmount: string,
  priceStr: string | undefined,
  snapshot: ConfirmationPriceSnapshot,
): { leg: LegUsdResult; usdProps: Record<string, unknown> } => {
  const leg = deriveLegUsd(tokenAmount, priceStr);
  return {
    leg,
    usdProps: {
      amount_usd_status: leg.status,
      ...(leg.status === LegUsdStatus.Ok
        ? {
            amount_usd: leg.value,
            amount_usd_rate: leg.rate,
            amount_usd_source: snapshot.source,
            amount_usd_price_freshness: snapshot.freshness,
          }
        : {}),
    },
  };
};

function useSubmitTxData({
  isHardwareWallet,
  networkDetails,
  publicKey,
  xdr,
}: {
  isHardwareWallet: boolean;
  networkDetails: NetworkDetails;
  publicKey: string;
  xdr: string;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<SubmitTxData, unknown>,
    initialState,
  );
  const submission = useSelector(transactionSubmissionSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const allBalancesCache = useSelector(balancesSelector);
  const allTokenPricesCache = useSelector(tokenPricesSelector);
  const useTokenPricesV2 = useSelector(tokenPricesV2Selector);
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: false,
  });
  const { fetchData: fetchCollectibles } = useGetCollectibles({
    useCache: false,
  });

  const {
    transactionData: {
      asset,
      amount,
      destination,
      federationAddress,
      destinationAsset,
      destinationAmount,
      isCollectible,
      collectibleData,
    },
    transactionSimulation,
  } = submission;
  const sourceAsset = getAssetFromCanonical(asset);

  const fetchData = async ({ isSwap }: { isSwap: boolean }) => {
    dispatch({ type: "FETCH_DATA_START" });
    // Declared outside the try so the catch can cancel it.
    let snapshotHandle: ConfirmationSnapshotHandle | null = null;
    try {
      const payload = {
        status: "success",
      } as SubmitTxData;

      // Everything the volume telemetry needs is snapshotted here, at
      // confirmation, before signing/submission — amounts and prices are
      // frozen together and carried to whichever terminal event fires.
      // Skipped entirely for collectible sends (unpriced, out of scope) and
      // for custom networks (not real economic activity, shouldn't pollute
      // volume metrics).
      const isCustom = isCustomNetwork(networkDetails);
      const accountBalances =
        allBalancesCache[networkDetails.network]?.[publicKey]?.balances ?? null;
      const sourceIdentity =
        !isCollectible && !isCustom
          ? classifyAssetIdentity(
              sourceAsset.code,
              sourceAsset.issuer,
              networkDetails.networkPassphrase,
              accountBalances,
            )
          : null;
      const destAssetParsed =
        isSwap && !isCollectible && !isCustom
          ? getAssetFromCanonical(destinationAsset)
          : null;
      const destIdentity = destAssetParsed
        ? classifyAssetIdentity(
            destAssetParsed.code,
            destAssetParsed.issuer,
            networkDetails.networkPassphrase,
            accountBalances,
          )
        : null;

      const cachedDisplayPrices =
        allTokenPricesCache[networkDetails.networkPassphrase]?.[publicKey] ??
        null;
      snapshotHandle = sourceIdentity
        ? startConfirmationPriceSnapshot({
            canonicalIds: [
              getCanonicalFromAsset(sourceIdentity.code, sourceIdentity.issuer),
              ...(destIdentity
                ? [
                    getCanonicalFromAsset(
                      destIdentity.code,
                      destIdentity.issuer,
                    ),
                  ]
                : []),
            ],
            networkDetails,
            useV2: useTokenPricesV2,
            cachedDisplayPrices,
          })
        : null;

      // Not a non-null assertion and not a guard: `preparedTransaction` is
      // legitimately null for a classic payment (simulateTx's "classic" arm
      // returns a fee and no payload at all — the built XDR arrives via the
      // `xdr` prop instead). It only holds a value for a Soroban/token
      // transfer, or for a hardware wallet, where HardwareSign stores the
      // already-signed XDR there. Everywhere else the signing step below
      // replaces it, so `?? ""` — the same fallback Send/index.tsx uses on
      // this field — is the honest starting value.
      let signedXDR = transactionSimulation.preparedTransaction ?? "";
      if (!isHardwareWallet) {
        const res = await reduxDispatch(
          signFreighterTransaction({
            transactionXDR: xdr,
            network: networkDetails.networkPassphrase,
          }),
        );
        if (
          signFreighterTransaction.fulfilled.match(res) &&
          res.payload.signedTransaction
        ) {
          signedXDR = res.payload.signedTransaction;
        }
      }

      const submitResp = await reduxDispatch(
        submitFreighterTransaction({
          publicKey,
          signedXDR,
          networkDetails,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        // NB: `transaction.submitted` is intentionally NOT emitted here. It is a
        // dApp *sign-and-submit* event, and the extension dApp API only
        // signs-and-returns (no submit path), so there's no conformant emit.
        // Internal broadcasts are already captured by the payment/swap/
        // collectible_send `.completed` events below.
        if (isSwap) {
          if (!isCustom) {
            // A swap is never a collectible send, so these were computed above:
            // sourceIdentity/destIdentity require !isCollectible && !isCustom,
            // snapshotHandle requires sourceIdentity.
            if (!sourceIdentity || !destIdentity || !snapshotHandle) {
              throw new Error(
                "Missing identity/snapshot data for swap telemetry",
              );
            }

            // Parsed lazily, here, rather than hoisted above: `signedXDR` is a
            // placeholder in some call sites/tests when a swap never actually
            // reaches submission, and this parse is only ever needed for a
            // settled swap.
            const Sdk = getSdk(networkDetails.networkPassphrase);
            const submittedTx = Sdk.TransactionBuilder.fromXdr(
              signedXDR,
              networkDetails.networkPassphrase,
            );

            const snapshot = snapshotHandle.resolve();
            const sourceCanonical = getCanonicalFromAsset(
              sourceIdentity.code,
              sourceIdentity.issuer,
            );
            const destCanonical = getCanonicalFromAsset(
              destIdentity.code,
              destIdentity.issuer,
            );
            const sourceUsd = buildSourceLegUsdProps(
              amount,
              snapshot.pricesById?.[sourceCanonical]?.currentPrice,
              snapshot,
            );

            // Settled destination amount, read from the transaction result —
            // never the quote. A user navigating away before the result is
            // readable (`not_observed`) has no extension analogue: Horizon's
            // response already carries `result_xdr`
            // synchronously, so a missing/unparseable read here is a genuine
            // derivation failure, reported as `error` rather than
            // `not_observed`.
            const opIndex = findPathPaymentStrictSendIndex(submittedTx);
            const settledDestAmount = getSettledPathPaymentStrictSendAmount(
              submitResp.payload.result_xdr,
              opIndex,
            );
            const destUsd: LegUsdResult | null =
              settledDestAmount !== null
                ? deriveLegUsd(
                    settledDestAmount,
                    snapshot.pricesById?.[destCanonical]?.currentPrice,
                  )
                : null;

            const executionSlippagePct =
              settledDestAmount !== null
                ? computeExecutionSlippagePct(
                    destinationAmount || undefined,
                    settledDestAmount,
                  )
                : undefined;
            const usdSlippagePct =
              sourceUsd.leg.status === LegUsdStatus.Ok &&
              destUsd?.status === LegUsdStatus.Ok &&
              sourceUsd.leg.value !== 0
                ? computeUsdSlippagePct(
                    sourceUsd.leg.unrounded,
                    destUsd.unrounded,
                  )
                : undefined;

            // Post-confirmation swap telemetry: the swap actually settled. A
            // routed/path payment settles here too — its outcome is a swap.
            emitMetric(METRIC_NAMES.swapCompleted, {
              from_asset_code: sourceAsset.code,
              to_asset_code: getAssetFromCanonical(destinationAsset).code,
              ...(sourceIdentity.issuer
                ? { from_asset_issuer: sourceIdentity.issuer }
                : {}),
              from_asset_type: sourceIdentity.type,
              ...(destIdentity.issuer
                ? { to_asset_issuer: destIdentity.issuer }
                : {}),
              to_asset_type: destIdentity.type,
              from_amount: new BigNumber(amount || 0).toNumber(),
              ...(destinationAmount
                ? {
                    to_amount_quoted: new BigNumber(
                      destinationAmount,
                    ).toNumber(),
                  }
                : {}),
              ...(settledDestAmount !== null
                ? { to_amount: settledDestAmount.toNumber() }
                : {}),
              to_amount_usd_status: destUsd?.status ?? LegUsdStatus.Error,
              ...(destUsd?.status === LegUsdStatus.Ok
                ? {
                    to_amount_usd: destUsd.value,
                    to_amount_usd_rate: destUsd.rate,
                  }
                : {}),
              ...(usdSlippagePct !== undefined
                ? { usd_slippage_pct: usdSlippagePct }
                : {}),
              ...(executionSlippagePct !== undefined
                ? { execution_slippage_pct: executionSlippagePct }
                : {}),
              ...sourceUsd.usdProps,
            });
            // Trustline added only once the combined changeTrust +
            // pathPaymentStrictSend transaction confirmed it. Gate on the
            // submitted transaction itself rather than the pick-time snapshot —
            // a defaulted/deep-linked destination has no snapshot, but the
            // changeTrust op it confirmed is right there in the XDR.
            const changeTrustOp =
              "operations" in submittedTx
                ? submittedTx.operations.find((op) => op.type === "changeTrust")
                : undefined;
            if (changeTrustOp && "line" in changeTrustOp) {
              const { line } = changeTrustOp;
              emitMetric(METRIC_NAMES.swapTrustlineAdded, {
                asset_code: "code" in line ? line.code : undefined,
                asset_issuer: "issuer" in line ? line.issuer : undefined,
              });
            }
          }
        } else {
          const isSelfOwnedDestination = (allAccounts ?? []).some(
            (account) => account.publicKey === destination,
          );

          if (!isSelfOwnedDestination) {
            await reduxDispatch(
              addRecentAddress({ address: federationAddress || destination }),
            );
          }

          if (!isCustom) {
            if (isCollectible) {
              emitMetric(METRIC_NAMES.collectibleSendCompleted, {
                collection_address: collectibleData.collectionAddress,
                token_id: collectibleData.tokenId,
              });
            } else {
              // A non-collectible, non-swap, non-custom-network send always
              // has these computed above (sourceIdentity/snapshotHandle
              // require !isCollectible && !isCustom).
              if (!sourceIdentity || !snapshotHandle) {
                throw new Error(
                  "Missing identity/snapshot data for payment telemetry",
                );
              }

              const snapshot = snapshotHandle.resolve();
              const sourceCanonical = getCanonicalFromAsset(
                sourceIdentity.code,
                sourceIdentity.issuer,
              );
              const sourceUsd = buildSourceLegUsdProps(
                amount,
                snapshot.pricesById?.[sourceCanonical]?.currentPrice,
                snapshot,
              );
              // Direct (non-routed) payment outcome.
              emitMetric(METRIC_NAMES.paymentCompleted, {
                payment_type: "payment",
                asset_code: sourceAsset.code,
                ...(sourceIdentity.issuer
                  ? { asset_issuer: sourceIdentity.issuer }
                  : {}),
                asset_type: sourceIdentity.type,
                amount: new BigNumber(amount || 0).toNumber(),
                ...sourceUsd.usdProps,
              });
            }
          }
        }

        // After successful submission, re-fetch balances and collectibles to get their latest values

        const balancesResult = await fetchBalances(
          publicKey,
          isMainnet(networkDetails),
          networkDetails,
          false,
        );

        await fetchCollectibles({
          publicKey,
          networkDetails,
        });

        if (isError<AccountBalances>(balancesResult)) {
          // we don't want to throw an error if balances fail to fetch as this doesn't affect the tx submission
          // let's simply log the error and continue - the user will need to refresh the Account page or wait for polling to refresh the balances
          captureException(
            `Failed to fetch balances after ${isSwap ? "swap" : "send"} tx submission - ${JSON.stringify(
              balancesResult.message,
            )} ${networkDetails.network}`,
          );
        }
      } else if (submitFreighterTransaction.rejected.match(submitResp)) {
        // Submission was attempted and we're reacting to its outcome — the
        // single, centralized failure-emit site (fixes the old effect-based
        // double-emit-on-remount bug in SubmitFail). A pre-submission failure
        // (signing, simulation) never reaches here, since nothing above this
        // point calls submitFreighterTransaction.
        const error = submitResp.payload;
        const resultCodes = getResultCodes(error);
        // A swap prepending a changeTrust operation reports one code per
        // operation (e.g. ["op_success", "op_under_dest_min"]) - the first
        // code that actually explains the failure isn't always index 0.
        const reasonCode =
          resultCodes.operations?.find(
            (code) => code !== "op_success" && code !== "op_not_attempted",
          ) ||
          resultCodes.transaction ||
          "unknown";
        const failureCategory = getFailureCategory(error, reasonCode);

        if (!isCustom) {
          if (isCollectible) {
            emitMetric(METRIC_NAMES.collectibleSendFailed, {
              reason_code: reasonCode,
            });
          } else if (isSwap) {
            if (!sourceIdentity || !destIdentity || !snapshotHandle) {
              throw new Error(
                "Missing identity/snapshot data for swap telemetry",
              );
            }

            const snapshot = snapshotHandle.resolve();
            const sourceCanonical = getCanonicalFromAsset(
              sourceIdentity.code,
              sourceIdentity.issuer,
            );
            const sourceUsd = buildSourceLegUsdProps(
              amount,
              snapshot.pricesById?.[sourceCanonical]?.currentPrice,
              snapshot,
            );
            // swap.failed carries no destination amount/USD at all — identity
            // only. This is also the sole emit point for a quote expiring at
            // submit (op_under_dest_min / op_too_few_offers):
            // failure_category: "slippage" falls out of the same mapping used
            // for every other rejection, so no special case is needed here or
            // in the Swap view's separate swap.quote_expired recovery flow.
            emitMetric(METRIC_NAMES.swapFailed, {
              from_asset_code: getAssetFromCanonical(asset).code,
              to_asset_code: getAssetFromCanonical(destinationAsset).code,
              ...(sourceIdentity.issuer
                ? { from_asset_issuer: sourceIdentity.issuer }
                : {}),
              from_asset_type: sourceIdentity.type,
              ...(destIdentity.issuer
                ? { to_asset_issuer: destIdentity.issuer }
                : {}),
              to_asset_type: destIdentity.type,
              // The failed event still carries the source token amount;
              // only destination amounts/USD are absent on swap.failed.
              from_amount: new BigNumber(amount || 0).toNumber(),
              reason_code: reasonCode,
              failure_category: failureCategory,
              ...sourceUsd.usdProps,
            });
          } else {
            if (!sourceIdentity || !snapshotHandle) {
              throw new Error(
                "Missing identity/snapshot data for payment telemetry",
              );
            }

            const snapshot = snapshotHandle.resolve();
            const sourceCanonical = getCanonicalFromAsset(
              sourceIdentity.code,
              sourceIdentity.issuer,
            );
            const sourceUsd = buildSourceLegUsdProps(
              amount,
              snapshot.pricesById?.[sourceCanonical]?.currentPrice,
              snapshot,
            );
            emitMetric(METRIC_NAMES.paymentFailed, {
              payment_type: "payment",
              asset_code: sourceAsset.code,
              ...(sourceIdentity.issuer
                ? { asset_issuer: sourceIdentity.issuer }
                : {}),
              asset_type: sourceIdentity.type,
              amount: new BigNumber(amount || 0).toNumber(),
              reason_code: reasonCode,
              failure_category: failureCategory,
              ...sourceUsd.usdProps,
            });
          }
        }
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      // Pre-submission failure (or a throw after the terminal event already
      // emitted): no terminal event will consume the snapshot, so cancel the
      // price fetch immediately rather than letting it outlive the flow.
      // Idempotent and safe after resolve().
      snapshotHandle?.cancel();
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useSubmitTxData };
