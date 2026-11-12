import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { DestinationTokenDetails } from "popup/ducks/transactionSubmission";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import { getAvailableBalance, isContractId } from "popup/helpers/soroban";
import { swapIdentityKey } from "popup/helpers/swapQuote";
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

// USD value of `amount` units priced at `price` per unit, rounded and formatted
// for a card's fiat line.
const formatUsdValue = (price: BigNumber.Value, amount: string): string =>
  formatAmount(
    roundUsdValue(
      new BigNumber(price)
        .multipliedBy(new BigNumber(cleanAmount(amount)))
        .toString(),
    ),
  );

interface GetSwapDerivedDataParams {
  data: ResolvedSwapAmountData;
  asset: string;
  destinationAsset: string;
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
  /** The stored quote's key matches the current inputs. */
  isQuoteForInputs: boolean;
  // Balances-derived "this swap adds a trustline", checked against the
  // UNFILTERED balances (a hidden held asset needs no new trustline). Drives
  // the reserve math; distinct from destinationIsNonHeld below, which is a
  // display-list concept for the direction toggle.
  destRequiresTrustline: boolean;
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
  destinationAmount,
  destinationTokenDetails,
  amount,
  amountUsd,
  fee,
  blockaidOverrideState,
  networkDetails,
  inputType,
  isQuoteForInputs,
  destRequiresTrustline,
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
  const heldKeys = new Set(
    sendData.userBalances.balances.map((b) =>
      swapIdentityKey(getBalanceCanonicalKey(b)),
    ),
  );
  const destinationIsNonHeld =
    Boolean(destinationAsset) &&
    !heldKeys.has(swapIdentityKey(destinationAsset));
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
  const priceValueUsd = assetPrice ? formatUsdValue(assetPrice, amount) : null;
  const supportsUsd = isMainnet(data.networkDetails) && assetPrice;
  const dstPriceValueUsd = dstAssetPrice
    ? formatUsdValue(dstAssetPrice, destinationAmount || "0")
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
    sourceIsXlm: isNativeAssetId(asset),
    // The unfiltered-balances flag, NOT destinationIsNonHeld: a hidden held
    // destination builds no changeTrust, so no reserve should be withheld.
    requiresTrustline: destRequiresTrustline,
  });
  const displayTotal = `${formatAmount(availableBalance)}`;

  // "Swap for 0.5 XLM" reserve-recovery affordance on the XlmReserveSheet.
  // The sell side is the current source when it's already a non-XLM
  // classic token; otherwise the largest held non-XLM classic balance.
  const sourceIsNonXlm = !!asset && !isNativeAssetId(asset);
  const sourceIsNonXlmClassic =
    sourceIsNonXlm && !isContractId(getAssetFromCanonical(asset).issuer);

  // Source token Blockaid verdict (from its held balance), passed to the review
  // gate so a flagged sell token also warns. XLM is never scanned.
  const sourceBalance = sourceIsNonXlm
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

  // The crypto amount is the source of truth in both display modes, so compare
  // it directly against the available balance.
  const isAmountTooHigh = new BigNumber(cleanAmount(amount)).gt(
    new BigNumber(availableBalance),
  );

  const swapAmountPositive =
    inputType === "crypto"
      ? new BigNumber(cleanAmount(amount)).gt(0)
      : new BigNumber(cleanAmount(amountUsd)).gt(0);

  // Pending means the stored quote is not for these inputs. A failed quote
  // also stores its key, so it settles; a dropped or superseded response
  // stores nothing, so it stays pending until the newer one lands.
  const isQuotePending =
    !!asset &&
    !!destinationAsset &&
    new BigNumber(cleanAmount(amount)).gt(0) &&
    !isQuoteForInputs;

  const hasNoSwapPath =
    swapAmountPositive &&
    !isQuotePending &&
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
    sourceIsNonXlm && new BigNumber(xlmSpendableForFees).lt(new BigNumber(fee));

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
    isQuotePending,
  });

  return {
    sendData,
    assetIcon,
    dstAssetIcon,
    destinationIsNonHeld,
    assetPrice,
    dstAssetPrice,
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
    isQuotePending,
    cta,
  };
};
