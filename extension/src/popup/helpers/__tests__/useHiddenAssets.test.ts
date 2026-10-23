import { act, renderHook, waitFor } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { AssetVisibility, IssuerKey } from "@shared/api/types";
import { useHiddenAssets } from "popup/helpers/useHiddenAssets";

// The hook reads the active account and network from the store; the test
// drives them through this object so a re-render can switch network. It is
// declared with `mock` so the hoisted jest.mock factory below can reach it.
const mockSelected = { publicKey: "G1", network: "PUBLIC" };

jest.mock("react-redux", () => ({
  useSelector: (selector: unknown) => {
    const { publicKeySelector } = jest.requireActual(
      "popup/ducks/accountServices",
    );
    return selector === publicKeySelector
      ? mockSelected.publicKey
      : { network: mockSelected.network };
  },
}));

const CANONICAL =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

type HiddenAssetsResponse = {
  hiddenAssets: Record<IssuerKey, AssetVisibility>;
  error: string;
};

const deferred = () => {
  let resolve!: (value: HiddenAssetsResponse) => void;
  const promise = new Promise<HiddenAssetsResponse>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("useHiddenAssets", () => {
  beforeEach(() => {
    mockSelected.publicKey = "G1";
    mockSelected.network = "PUBLIC";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ignores a stale read that resolves after a network switch", async () => {
    const mainnet = deferred();
    const testnet = deferred();
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockReturnValueOnce(mainnet.promise)
      .mockReturnValueOnce(testnet.promise);

    const { result, rerender } = renderHook(() => useHiddenAssets());

    mockSelected.network = "TESTNET";
    rerender();

    await waitFor(() =>
      expect(ApiInternal.getHiddenAssets).toHaveBeenCalledTimes(2),
    );

    // The newer (testnet) read lands first, then the stale mainnet one.
    await act(async () => {
      testnet.resolve({ hiddenAssets: {}, error: "" });
    });
    await act(async () => {
      mainnet.resolve({ hiddenAssets: { [CANONICAL]: "hidden" }, error: "" });
    });

    expect(result.current.isAssetHidden(CANONICAL)).toBe(false);
  });

  it("keeps the write's response over a read still in flight", async () => {
    const read = deferred();
    jest.spyOn(ApiInternal, "getHiddenAssets").mockReturnValue(read.promise);
    jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" });

    const { result } = renderHook(() => useHiddenAssets());

    await act(async () => {
      await result.current.setAssetVisibility(CANONICAL, "visible");
    });
    await act(async () => {
      read.resolve({ hiddenAssets: { [CANONICAL]: "hidden" }, error: "" });
    });

    expect(result.current.isAssetHidden(CANONICAL)).toBe(false);
  });
});
