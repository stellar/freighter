import React from "react";
import { Provider } from "react-redux";
import { act, renderHook, waitFor } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { lockAccount, saveAccount } from "popup/ducks/accountServices";
import { useIsCollectibleTracked } from "../useIsCollectibleTracked";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getCollectibles: jest.fn(),
}));

const COLLECTION = "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const TOKEN_ID = "2";
const OTHER_PUBLIC_KEY =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const trackedList = {
  error: "",
  collectiblesList: [{ id: COLLECTION, tokenIds: [TOKEN_ID] }],
};
const emptyList = { error: "", collectiblesList: [] };

/** Switches the active account without unmounting the hook. */
const switchAccountTo = (publicKey: string) =>
  saveAccount({
    hasPrivateKey: true,
    publicKey,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [TEST_PUBLIC_KEY, OTHER_PUBLIC_KEY],
    bipPath: "",
    tokenIdList: [],
  });

const renderIsCollectibleTracked = () => {
  const store = makeDummyStore({
    auth: {
      allAccounts: [TEST_PUBLIC_KEY],
      publicKey: TEST_PUBLIC_KEY,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
    settings: { networkDetails: TESTNET_NETWORK_DETAILS },
  });

  const result = renderHook(
    () =>
      useIsCollectibleTracked({
        collectionAddress: COLLECTION,
        tokenId: TOKEN_ID,
      }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      ),
    },
  );

  return { ...result, store };
};

describe("useIsCollectibleTracked", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports tracked for a collectible in the wallet's own list", async () => {
    (ApiInternal.getCollectibles as jest.Mock).mockResolvedValue(trackedList);

    const { result } = renderIsCollectibleTracked();

    // False until the read lands: Remove must not be offered on a guess.
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("reports untracked for a backend-only collectible", async () => {
    (ApiInternal.getCollectibles as jest.Mock).mockResolvedValue(emptyList);

    const { result } = renderIsCollectibleTracked();

    await waitFor(() => expect(ApiInternal.getCollectibles).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("stops reporting tracked once the wallet locks", async () => {
    (ApiInternal.getCollectibles as jest.Mock).mockResolvedValue(trackedList);

    const { result, store } = renderIsCollectibleTracked();
    await waitFor(() => expect(result.current).toBe(true));

    // `lockAccount` empties publicKey, so the effect re-runs and returns early
    // without fetching. Without the reset it would keep answering `true` for
    // the account that just went away.
    act(() => {
      store.dispatch(lockAccount());
    });

    expect(result.current).toBe(false);
  });

  it("does not answer for the previous account while the next lookup is in flight", async () => {
    (ApiInternal.getCollectibles as jest.Mock).mockResolvedValue(trackedList);

    const { result, store } = renderIsCollectibleTracked();
    await waitFor(() => expect(result.current).toBe(true));

    // Hold the second response open so the in-flight window is observable.
    let resolveSecond: (value: unknown) => void = () => {};
    (ApiInternal.getCollectibles as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );

    act(() => {
      store.dispatch(switchAccountTo(OTHER_PUBLIC_KEY));
    });

    // The point of the fix: the previous account's answer is not carried over
    // into the window before the new one resolves.
    expect(result.current).toBe(false);

    await act(async () => {
      resolveSecond(emptyList);
    });
    expect(result.current).toBe(false);
  });

  it("falls back to untracked when the lookup fails", async () => {
    (ApiInternal.getCollectibles as jest.Mock).mockResolvedValue(trackedList);

    const { result, store } = renderIsCollectibleTracked();
    await waitFor(() => expect(result.current).toBe(true));

    // The catch leaves the flag alone, so the reset is what keeps a failed read
    // from inheriting the previous scope's `true`.
    (ApiInternal.getCollectibles as jest.Mock).mockRejectedValue(
      new Error("offline"),
    );

    act(() => {
      store.dispatch(switchAccountTo(OTHER_PUBLIC_KEY));
    });

    await waitFor(() =>
      expect(ApiInternal.getCollectibles).toHaveBeenCalledTimes(2),
    );
    expect(result.current).toBe(false);
  });
});
