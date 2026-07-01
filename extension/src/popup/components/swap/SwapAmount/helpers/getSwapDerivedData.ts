import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { DestinationTokenDetails } from "popup/ducks/transactionSubmission";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { getAssetDecimals, getAvailableBalance } from "popup/helpers/soroban";
import {
  findAssetBalance,
  getBalanceCanonicalKey,
} from "popup/helpers/balance";
import {
  getAssetSecurityLevel,
  extractAssetScanWarnings,
} from "popup/helpers/blockaid";
import {
  deductNewTrustlineReserve,
  pickBestNonXlmClassicCanonical,
} from "popup/helpers/xlmReserve";
import { InputType } from "helpers/transaction";
import { getSwapCtaState } from "./swapCtaState";
import { ResolvedSwapAmountData } from "../hooks/useGetSwapAmountData";

interface GetSwapDerivedDataParams {
  data: ResolvedSwapAmountData;
  asset: string;
  destinationAsset: string;
  isToken: boolean;
  destinationAmount: string;
  destinationTokenDetails: DestinationTokenDetails | null;
  /** formik.values.amount */
  amount: string;
  /** formik.values.amountUsd */
  amountUsd: string;
  fee: string;
  blockaidOverrideState?: string | null;
  networkDetails: NetworkDetails;
  inputType: InputType;
  isLiveQuoteLoading: boolean;
}

/**
 * Pure derivation of every balance/price/fee/security/CTA value the swap amount
 * screen renders from the resolved swap data. Runs below the component's early
 * returns, so it is a plain function (a hook here would violate rules-of-hooks)
 * and the filter/sort work is cheap.
 */
export const getSwapDerivedData = ({
  data,
  asset,
  destinationAsset,
  isToken,
  destinationAmount,
  destinationTokenDetails,
  amount,
  amountUsd,
  fee,
  blockaidOverrideState,
  networkDetails,
  inputType,
  isLiveQuoteLoading,
}: GetSwapDerivedDataParams) => {
  const sendData = data;
  const assetIcon = sendData.icons[asset];
  // The icons map only carries held-token logos. A non-held destination token
  // (picked from search/popular) isn't in it, so fall back to the icon URL
  // captured on the picked token so the receive picker shows its logo too.
  const dstAssetIcon =
    sendData.icons[destinationAsset] ||
    destinationTokenDetails?.iconUrl ||
    null;
  // A non-held destination token can never become the source (we only swap
  // held/classic assets), so the direction toggle handles it specially. Detect
  // it by its absence from the account balances.
  const heldCanonicals = new Set(
    sendData.userBalances.balances.map((b) => getBalanceCanonicalKey(b)),
  );
  const destinationIsNonHeld =
    Boolean(destinationAsset) && !heldCanonicals.has(destinationAsset);
  const prices = sendData.tokenPrices;
  const assetPrice = prices[asset] && prices[asset].currentPrice;
  // Prefer the live backend price; fall back to the stellar.expert spot price
  // captured when the (non-held) destination token was picked, so the receive
  // card shows a fiat value instead of "--" when /token-prices has no entry.
  const dstSpotPrice = destinationTokenDetails?.spotPrice;
  const dstAssetPrice =
    prices[destinationAsset]?.currentPrice ??
    // Spot-price fallback is mainnet-only, mirroring the /token-prices gate so
    // the receive card never shows a fiat value the sell card can't.
    (isMainnet(data.networkDetails) && dstSpotPrice != null
      ? String(dstSpotPrice)
      : undefined);
  const assetDecimals = getAssetDecimals(asset, sendData.userBalances, isToken);
  const priceValue = assetPrice
    ? new BigNumber(cleanAmount(amountUsd))
        .dividedBy(new BigNumber(assetPrice))
        .decimalPlaces(assetDecimals)
        .toString()
    : null;
  const priceValueUsd = assetPrice
    ? `${formatAmount(
        roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(cleanAmount(amount)))
            .toString(),
        ),
      )}`
    : null;
  const supportsUsd = isMainnet(data.networkDetails) && assetPrice;
  const dstPriceValueUsd = dstAssetPrice
    ? formatAmount(
        roundUsdValue(
          new BigNumber(dstAssetPrice)
            .multipliedBy(new BigNumber(cleanAmount(destinationAmount || "0")))
            .toString(),
        ),
      )
    : null;
  const baseAvailableBalance = asset
    ? getAvailableBalance({
        assetCanonical: asset,
        balances: sendData.userBalances.balances,
        recommendedFee: fee,
      })
    : "0";
  // When swapping XLM into a new token, reserve the 0.5 XLM trustline bump
  // up-front so it's excluded from Max / percentage buttons and the
  // insufficient-balance check.
  const availableBalance = deductNewTrustlineReserve({
    spendable: baseAvailableBalance,
    sourceIsXlm: asset === "native",
    requiresTrustline: destinationTokenDetails?.requiresTrustline ?? false,
  });
  const displayTotal = `${formatAmount(availableBalance)}`;

  // "Swap for 0.5 XLM" reserve-recovery affordance on the XlmReserveSheet.
  // The sell side is the current source when it's already a non-XLM
  // classic token; otherwise the largest held non-XLM classic balance.
  const sourceIsNonXlmClassic = !!asset && asset !== "native";

  // Source token Blockaid verdict (from its held balance), passed to the review
  // gate so a flagged sell token also warns. XLM is never scanned.
  const sourceBalance = sourceIsNonXlmClassic
    ? findAssetBalance(
        sendData.userBalances.balances,
        getAssetFromCanonical(asset),
      )
    : null;
  const sourceTokenSecurityLevel =
    sourceBalance && "blockaidData" in sourceBalance
      ? getAssetSecurityLevel({
          blockaidData: sourceBalance.blockaidData,
          blockaidOverrideState,
          networkDetails,
        })
      : undefined;
  // Friendly per-feature reasons from the source token scan, surfaced in the
  // review's Blockaid pane alongside the transaction-scan reasons.
  const sourceTokenSecurityWarnings =
    sourceBalance && "blockaidData" in sourceBalance
      ? extractAssetScanWarnings(sourceBalance.blockaidData)
      : undefined;

  const bestNonXlmClassicCanonical = pickBestNonXlmClassicCanonical(
    sendData.userBalances.balances,
  );
  const canSwapForReserve =
    sourceIsNonXlmClassic || !!bestNonXlmClassicCanonical;

  const isAmountTooHigh =
    (inputType === "crypto" &&
      new BigNumber(cleanAmount(amount)).gt(new BigNumber(availableBalance))) ||
    (inputType === "fiat" &&
      new BigNumber(cleanAmount(priceValue ?? "0")).gt(
        new BigNumber(availableBalance),
      ));

  const swapAmountPositive =
    inputType === "crypto"
      ? new BigNumber(cleanAmount(amount)).gt(0)
      : new BigNumber(cleanAmount(amountUsd)).gt(0);

  // The live quote settled with no route for a positive amount → no swap path.
  // While a quote is in flight (isLiveQuoteLoading) we leave the CTA enabled so
  // it doesn't flicker disabled between keystrokes.
  const hasNoSwapPath =
    swapAmountPositive &&
    !isLiveQuoteLoading &&
    new BigNumber(cleanAmount(destinationAmount || "0")).isZero();

  // Non-XLM swaps pay the network fee from the separate XLM balance; block the
  // CTA when that balance can't cover the fee. XLM-source swaps already
  // fold the fee into availableBalance, so this only applies to non-XLM sources.
  const xlmSpendableForFees = getAvailableBalance({
    assetCanonical: "native",
    balances: sendData.userBalances.balances,
    recommendedFee: "0",
  });
  const insufficientXlmForFees =
    sourceIsNonXlmClassic &&
    new BigNumber(xlmSpendableForFees).lt(new BigNumber(fee));

  const cta = getSwapCtaState({
    hasSource: !!asset,
    hasDestination: !!destinationAsset,
    // availableBalance already nets out the network fee + the new-trustline
    // 0.5 XLM reserve, so a barely-funded account correctly reads as empty.
    availableBalanceIsZero: new BigNumber(
      cleanAmount(availableBalance),
    ).isLessThanOrEqualTo(0),
    amountIsZero: !swapAmountPositive,
    isAmountTooHigh,
    insufficientXlmForFees,
    hasNoSwapPath,
  });

  return {
    sendData,
    assetIcon,
    dstAssetIcon,
    destinationIsNonHeld,
    assetPrice,
    dstAssetPrice,
    assetDecimals,
    priceValue,
    priceValueUsd,
    supportsUsd,
    dstPriceValueUsd,
    availableBalance,
    displayTotal,
    sourceIsNonXlmClassic,
    sourceTokenSecurityLevel,
    sourceTokenSecurityWarnings,
    bestNonXlmClassicCanonical,
    canSwapForReserve,
    isAmountTooHigh,
    xlmSpendableForFees,
    insufficientXlmForFees,
    cta,
  };
};
