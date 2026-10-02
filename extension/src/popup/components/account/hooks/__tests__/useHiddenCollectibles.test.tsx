import React from "react";
import { Provider } from "react-redux";
import { act, renderHook, waitFor } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { saveAccount } from "popup/ducks/accountServices";
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

const OTHER_PUBLIC_KEY =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

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

/** A promise whose settlement this test controls. */
const deferred = <T,>() => {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle: (value: T) => settle(value) };
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

  it("ignores a superseded error rather than reporting it against the new account", async () => {
    const first = deferred<{ hiddenCollectibles: {}; error: string }>();
    const second = deferred<{ hiddenCollectibles: {}; error: string }>();
    (ApiInternal.getHiddenCollectibles as jest.Mock)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result, store } = renderUseHiddenCollectibles();

    // Switch before A's request settles, then let A fail.
    act(() => {
      store.dispatch(switchAccountTo(OTHER_PUBLIC_KEY));
    });
    await act(async () => {
      first.settle({ hiddenCollectibles: {}, error: "A went wrong" });
    });

    // `Account` suppresses its loader on this signal, so reporting A's failure
    // here would paint B's grid unfiltered while B's own request is pending.
    expect(result.current.hiddenCollectiblesError).toBe("");
    expect(result.current.isHiddenCollectiblesLoading).toBe(true);
  });

  it("still saves a superseded success under its own account key", async () => {
    const first = deferred<{ hiddenCollectibles: {}; error: string }>();
    const second = deferred<{ hiddenCollectibles: {}; error: string }>();
    (ApiInternal.getHiddenCollectibles as jest.Mock)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { store } = renderUseHiddenCollectibles();

    act(() => {
      store.dispatch(switchAccountTo(OTHER_PUBLIC_KEY));
    });
    await act(async () => {
      first.settle({
        hiddenCollectibles: { [COLLECTIBLE_KEY]: "hidden" },
        error: "",
      });
    });

    // publicKey/networkName are captured from the render that started the
    // fetch, so the map is correctly keyed -- discarding it would only force a
    // refetch when that account comes back.
    const state = store.getState() as {
      hiddenCollectibles: {
        hiddenCollectibles: Record<string, Record<string, unknown>>;
      };
    };
    expect(
      state.hiddenCollectibles.hiddenCollectibles[
        TESTNET_NETWORK_DETAILS.networkName
      ][TEST_PUBLIC_KEY],
    ).toEqual({ [COLLECTIBLE_KEY]: "hidden" });
  });

  it("keys the map by the network the background reports, not the one it asked from", async () => {
    // The request carries no network -- the background resolves NETWORK_ID
    // while handling it -- so a switch committing mid-flight answers with the
    // other network's map.
    (ApiInternal.getHiddenCollectibles as jest.Mock).mockResolvedValue({
      hiddenCollectibles: { [COLLECTIBLE_KEY]: "hidden" },
      networkName: MAINNET_NETWORK_DETAILS.networkName,
      error: "",
    });

    const { result, store } = renderUseHiddenCollectibles();

    await waitFor(() => {
      const { hiddenCollectibles } = (
        store.getState() as {
          hiddenCollectibles: {
            hiddenCollectibles: Record<string, Record<string, unknown>>;
          };
        }
      ).hiddenCollectibles;
      expect(
        hiddenCollectibles[MAINNET_NETWORK_DETAILS.networkName]?.[
          TEST_PUBLIC_KEY
        ],
      ).toEqual({ [COLLECTIBLE_KEY]: "hidden" });
    });

    const { hiddenCollectibles } = (
      store.getState() as {
        hiddenCollectibles: {
          hiddenCollectibles: Record<string, Record<string, unknown>>;
        };
      }
    ).hiddenCollectibles;

    // Filing mainnet's map under testnet is what makes the corruption stick:
    // the selector reads a present key as loaded and never refetches it.
    expect(
      hiddenCollectibles[TESTNET_NETWORK_DETAILS.networkName],
    ).toBeUndefined();
    expect(result.current.hiddenCollectibles).toBeUndefined();
    expect(result.current.isHiddenCollectiblesLoading).toBe(true);
  });

  it("falls back to the requesting network when the response reports none", async () => {
    // A service worker from before the handler echoed a network. Falling back
    // is no worse than what it did then.
    (ApiInternal.getHiddenCollectibles as jest.Mock).mockResolvedValue({
      hiddenCollectibles: { [COLLECTIBLE_KEY]: "hidden" },
      networkName: "",
      error: "",
    });

    const { result, store } = renderUseHiddenCollectibles();

    await waitFor(() => {
      expect(result.current.isHiddenCollectiblesLoading).toBe(false);
    });

    const state = store.getState() as {
      hiddenCollectibles: {
        hiddenCollectibles: Record<string, Record<string, unknown>>;
      };
    };
    expect(
      state.hiddenCollectibles.hiddenCollectibles[
        TESTNET_NETWORK_DETAILS.networkName
      ][TEST_PUBLIC_KEY],
    ).toEqual({ [COLLECTIBLE_KEY]: "hidden" });
  });
});
