import React from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { useHiddenCollectibles } from "../useHiddenCollectibles";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getHiddenCollectibles: jest.fn(),
}));

const COLLECTIBLE_KEY = "CCOLLECTION:1";

const renderUseHiddenCollectibles = () => {
  const store = makeDummyStore({
    auth: {
      allAccounts: [],
      publicKey: TEST_PUBLIC_KEY,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
    settings: { networkDetails: TESTNET_NETWORK_DETAILS },
    hiddenCollectibles: { hiddenCollectibles: {} },
  });

  const result = renderHook(() => useHiddenCollectibles(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

  return { ...result, store };
};

describe("useHiddenCollectibles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports loading until the scoped map lands", async () => {
    (ApiInternal.getHiddenCollectibles as jest.Mock).mockResolvedValue({
      hiddenCollectibles: { [COLLECTIBLE_KEY]: "hidden" },
      error: "",
    });

    const { result } = renderUseHiddenCollectibles();

    // Before the fetch resolves the map is unknown, which is not the same as
    // "nothing hidden" -- callers must be able to wait rather than paint.
    expect(result.current.isHiddenCollectiblesLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isHiddenCollectiblesLoading).toBe(false);
    });
    expect(result.current.isCollectibleHidden("CCOLLECTION", "1")).toBe(true);
  });

  it("does not persist an empty map when the background returns an error", async () => {
    (ApiInternal.getHiddenCollectibles as jest.Mock).mockResolvedValue({
      hiddenCollectibles: {},
      error: "something went wrong",
    });

    const { result, store } = renderUseHiddenCollectibles();

    await waitFor(() => {
      expect(result.current.hiddenCollectiblesError).toBe(
        "something went wrong",
      );
    });

    // Writing `{}` here is what makes the exposure permanent: the slice would
    // read as "loaded, nothing hidden" and every hidden collectible would show.
    expect(
      (store.getState() as { hiddenCollectibles: { hiddenCollectibles: {} } })
        .hiddenCollectibles.hiddenCollectibles,
    ).toEqual({});
    expect(result.current.hiddenCollectibles).toBeUndefined();
    expect(result.current.isHiddenCollectiblesLoading).toBe(true);
  });
});
