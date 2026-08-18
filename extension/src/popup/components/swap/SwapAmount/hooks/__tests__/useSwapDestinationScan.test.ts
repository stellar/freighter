import { renderHook, waitFor, act } from "@testing-library/react";

// Keep the real verdict logic (getAssetSecurityLevel / isBlockaidEnabled) so we
// exercise the actual UNABLE_TO_SCAN mapping; stub only the network scan.
jest.mock("popup/helpers/blockaid", () => ({
  ...jest.requireActual("popup/helpers/blockaid"),
  scanAssetBulk: jest.fn(),
}));
// The hook reads the picker's in-session scan cache from this module.
jest.mock("popup/components/swap/SwapAsset/hooks/useSwapTokenLookup", () => ({
  getCachedAssetScan: jest.fn(),
}));

import { scanAssetBulk } from "popup/helpers/blockaid";
import { getCachedAssetScan } from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";
import {
  DestinationTokenDetails,
  saveDestinationTokenDetails,
} from "popup/ducks/transactionSubmission";
import { SecurityLevel } from "popup/constants/blockaid";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";
import { useSwapDestinationScan } from "../useSwapDestinationScan";

const details = {
  tokenCode: "EVIL",
  issuer: "GEVIL",
  requiresTrustline: true,
  decimals: 7,
  securityLevel: undefined,
} as DestinationTokenDetails;
const id = "EVIL-GEVIL";

const renderScan = (dispatch: jest.Mock) =>
  renderHook(() =>
    useSwapDestinationScan({
      destinationTokenDetails: details,
      networkDetails: MAINNET_NETWORK_DETAILS,
      dispatch: dispatch as unknown as AppDispatch,
    }),
  );

describe("useSwapDestinationScan", () => {
  afterEach(() => jest.clearAllMocks());

  it("resolves a failed recovery scan to UNABLE_TO_SCAN (no fail-open)", async () => {
    (getCachedAssetScan as jest.Mock).mockReturnValue(undefined);
    (scanAssetBulk as jest.Mock).mockResolvedValue(null);
    const dispatch = jest.fn();

    renderScan(dispatch);

    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch).toHaveBeenCalledWith(
      saveDestinationTokenDetails({
        ...details,
        securityLevel: SecurityLevel.UNABLE_TO_SCAN,
      }),
    );
  });

  it("resolves a flagged recovery scan to MALICIOUS", async () => {
    (getCachedAssetScan as jest.Mock).mockReturnValue(undefined);
    (scanAssetBulk as jest.Mock).mockResolvedValue({
      results: { [id]: { result_type: "Malicious" } },
    });
    const dispatch = jest.fn();

    renderScan(dispatch);

    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch).toHaveBeenCalledWith(
      saveDestinationTokenDetails({
        ...details,
        securityLevel: SecurityLevel.MALICIOUS,
      }),
    );
  });

  it("does not write a verdict for a superseded scan (unmounted mid-flight)", async () => {
    (getCachedAssetScan as jest.Mock).mockReturnValue(undefined);
    let resolveScan: (value: unknown) => void = () => {};
    (scanAssetBulk as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveScan = resolve;
      }),
    );
    const dispatch = jest.fn();

    const { unmount } = renderScan(dispatch);
    unmount();

    await act(async () => {
      resolveScan({ results: { [id]: { result_type: "Malicious" } } });
    });

    expect(dispatch).not.toHaveBeenCalled();
  });
});
