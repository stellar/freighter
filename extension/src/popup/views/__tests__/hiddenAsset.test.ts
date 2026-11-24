import {
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveDestinationTokenDetails,
  saveIsToken,
} from "popup/ducks/transactionSubmission";
import { hiddenAssetSwapActions } from "popup/views/Swap/hiddenAsset";

const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const KALE = "KALE:CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV";

describe("hiddenAssetSwapActions", () => {
  it("clears a hidden source and resets the amount, as a new source pick does", () => {
    expect(
      hiddenAssetSwapActions(USDC, { asset: USDC, destinationAsset: KALE }),
    ).toEqual([
      saveAsset(""),
      saveIsToken(false),
      saveAmount("0"),
      saveAmountUsd("0.00"),
    ]);
  });

  it("clears a hidden destination and keeps the amount", () => {
    expect(
      hiddenAssetSwapActions(KALE, { asset: USDC, destinationAsset: KALE }),
    ).toEqual([saveDestinationAsset(""), saveDestinationTokenDetails(null)]);
  });

  it("does nothing for a token on neither side", () => {
    expect(
      hiddenAssetSwapActions(USDC, { asset: "native", destinationAsset: "" }),
    ).toEqual([]);
  });
});
