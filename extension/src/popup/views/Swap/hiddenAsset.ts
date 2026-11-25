import {
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveDestinationTokenDetails,
  saveIsToken,
} from "popup/ducks/transactionSubmission";
import { swapSidesMatching } from "popup/helpers/swapQuote";

/**
 * The store updates for a token hidden or removed from a picker's details
 * sheet: it can no longer be swapped, so it leaves whichever side holds it.
 * Losing the source also resets the amount, as picking a new source does.
 */
export const hiddenAssetSwapActions = (
  canonical: string,
  sides: { asset: string; destinationAsset: string },
) => {
  const matching = swapSidesMatching(canonical, sides);
  return [
    ...(matching.source
      ? [
          saveAsset(""),
          saveIsToken(false),
          saveAmount("0"),
          saveAmountUsd("0.00"),
        ]
      : []),
    ...(matching.destination
      ? [saveDestinationAsset(""), saveDestinationTokenDetails(null)]
      : []),
  ];
};
