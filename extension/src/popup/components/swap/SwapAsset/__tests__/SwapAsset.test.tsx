import React from "react";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { captureException } from "@sentry/browser";

import { Wrapper } from "popup/__testHelpers__";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import * as UseSwapFromData from "popup/components/swap/SwapAsset/hooks/useSwapFromData";
import * as UseSwapTokenLookup from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";
import * as Soroban from "popup/helpers/soroban";
import { SwapAsset } from "popup/components/swap/SwapAsset";

jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

jest.mock("popup/components/account/AssetDetail/AssetDetailSheet", () => ({
  AssetDetailSheet: ({
    asset,
    swapTo,
    onBalancesChanged,
  }: {
    asset: { canonical: string; name?: string; spotPrice?: number } | null;
    swapTo?: { code: string; side: "to" | "from"; onSelect: () => void };
    onBalancesChanged?: (change: "hidden" | "removed") => void;
  }) =>
    asset ? (
      <div
        data-testid="asset-detail-sheet"
        data-name={asset.name}
        data-spot-price={asset.spotPrice}
      >
        {asset.canonical}
        <button
          type="button"
          data-testid="asset-detail-hide"
          onClick={() => onBalancesChanged?.("hidden")}
        >
          hide
        </button>
        {swapTo ? (
          <button
            type="button"
            data-testid="asset-detail-swap-to-button"
            data-side={swapTo.side}
            onClick={swapTo.onSelect}
          >
            {swapTo.code}
          </button>
        ) : null}
      </div>
    ) : null,
}));

const resolvedFromState = {
  state: RequestState.SUCCESS,
  data: {
    type: AppDataType.RESOLVED,
    publicKey: "G123",
    balances: { balances: [], icons: {} },
    filteredBalances: [],
    networkDetails: { network: "PUBLIC", networkUrl: "" },
    applicationState: "MNEMONIC_PHRASE_CONFIRMED",
    tokenPrices: {},
  },
  error: null,
};

const emptyLookupResult = {
  sections: {
    yourTokens: [],
    popular: [],
    verified: [],
    unverified: [],
  },
  isSearch: false,
  isFallback: false,
};

describe("SwapAsset selectionType", () => {
  beforeEach(() => {
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: resolvedFromState,
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: emptyLookupResult,
        error: null,
      },
    } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it("source: renders the 'Swap from' header and the Your tokens list", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="source"
          hiddenAssets={[]}
          onClickAsset={jest.fn()}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    // Both source and destination use SwapPickerSections (held tokens only).
    expect(screen.getByText("Swap from")).toBeInTheDocument();
    expect(screen.getByTestId("swap-picker-sections")).toBeInTheDocument();
    expect(screen.queryByTestId("token-list")).toBeNull();
  });

  it("destination: renders the 'Swap to' header and SwapPickerSections", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={jest.fn()}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByText("Swap to")).toBeInTheDocument();
    expect(screen.getByTestId("swap-picker-sections")).toBeInTheDocument();
    expect(screen.queryByTestId("token-list")).toBeNull();
  });

  it("destination: forwards the widened descriptor (canonical, isContract, details) on pick", () => {
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            yourTokens: [],
            popular: [
              {
                canonical: "AQUA:G456",
                code: "AQUA",
                issuer: "G456",
                domain: "aqua.network",
                image: "icon_url",
                isHeld: false,
                isContract: false,
                requiresTrustline: true,
              },
            ],
            verified: [],
            unverified: [],
          },
          isSearch: false,
          isFallback: false,
        },
        error: null,
      },
    } as any);

    const onClickAsset = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={onClickAsset}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId("SwapTokenRow-AQUA-body"));

    expect(onClickAsset).toHaveBeenCalledTimes(1);
    const [canonical, isContract, details] = onClickAsset.mock.calls[0];
    expect(canonical).toBe("AQUA:G456");
    expect(isContract).toBe(false);
    expect(details).toMatchObject({
      tokenCode: "AQUA",
      issuer: "G456",
      requiresTrustline: true,
      decimals: 7,
      iconUrl: "icon_url",
      source: "popular",
    });
  });

  it("destination: typing clears all results and shows the loader until the lookup settles", async () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={jest.fn()}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("swap-picker-sections")).toBeInTheDocument();

    // Typing immediately replaces every result (held + non-held) with the
    // loader, instead of leaving stale held tokens visible during the debounce.
    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "AQ" },
    });

    expect(screen.queryByTestId("swap-picker-sections")).toBeNull();
    expect(document.querySelector(".SwapFrom__loader")).toBeInTheDocument();

    // Regression guard: the loader must clear when the lookup settles with a
    // SUCCESS→SUCCESS cache hit, not only on a fresh SUCCESS.
    await waitFor(() => {
      expect(document.querySelector(".SwapFrom__loader")).toBeNull();
    });
    expect(screen.getByTestId("swap-picker-sections")).toBeInTheDocument();
  });

  it("source: typing does not show the loader (the filter is synchronous)", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="source"
          hiddenAssets={[]}
          onClickAsset={jest.fn()}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "US" },
    });

    expect(screen.getByTestId("swap-picker-sections")).toBeInTheDocument();
    expect(document.querySelector(".SwapFrom__loader")).toBeNull();
  });

  it("destination: runs the idle lookup with the account's held balances", () => {
    const heldUsdc = {
      token: { code: "USDC", issuer: { key: "GUSD" } },
      total: "10",
    };
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          balances: { balances: [heldUsdc], icons: {} },
        },
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    const lookupFetchData = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: lookupFetchData,
      state: {
        state: RequestState.SUCCESS,
        data: emptyLookupResult,
        error: null,
      },
    } as any);

    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={jest.fn()}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    // The held balances (not an empty array) must reach the token lookup so the
    // "Your tokens" section can be populated.
    expect(lookupFetchData).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: "", balances: [heldUsdc] }),
    );
  });
});

describe("SwapAsset destination: a contract token the account doesn't hold", () => {
  const CONTRACT = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
  const tokenRow = {
    canonical: `TKN:${CONTRACT}`,
    code: "TKN",
    issuer: CONTRACT,
    contract: CONTRACT,
    domain: null,
    isHeld: false,
    isContract: true,
    requiresTrustline: false,
    // stellar.expert's (toml-sourced) value: never what the pick stores.
    decimals: 6,
  };
  const aquaRow = {
    canonical: "AQUA:G456",
    code: "AQUA",
    issuer: "G456",
    domain: "aqua.network",
    isHeld: false,
    isContract: false,
    requiresTrustline: true,
  };

  const renderPicker = (onClickAsset = jest.fn()) => {
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: resolvedFromState,
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            yourTokens: [],
            popular: [aquaRow, tokenRow],
            verified: [],
            unverified: [],
          },
          isSearch: false,
          isFallback: false,
        },
        error: null,
      },
    } as any);
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={onClickAsset}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );
    return onClickAsset;
  };

  afterEach(() => jest.restoreAllMocks());

  it("reads its decimals from the backend before the pick applies", async () => {
    const getDecimals = jest
      .spyOn(Soroban, "getDecimalsForAsset")
      .mockResolvedValue(18);
    const onClickAsset = renderPicker();

    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));

    await waitFor(() => expect(onClickAsset).toHaveBeenCalledTimes(1));
    expect(getDecimals).toHaveBeenCalledWith(
      expect.objectContaining({ assetIssuer: CONTRACT, publicKey: "G123" }),
    );
    expect(onClickAsset.mock.calls[0][2]).toMatchObject({
      tokenCode: "TKN",
      decimals: 18,
    });
  });

  it("refuses the pick when the decimals can't be read, and says so", async () => {
    jest
      .spyOn(Soroban, "getDecimalsForAsset")
      .mockRejectedValue(new Error("rpc down"));
    const onClickAsset = renderPicker();

    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));

    expect(
      await screen.findByText(
        "Couldn't read this token's details. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(onClickAsset).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalled();
  });

  it("clears the pick error when the search term changes", async () => {
    jest
      .spyOn(Soroban, "getDecimalsForAsset")
      .mockRejectedValue(new Error("rpc down"));
    renderPicker();

    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));
    expect(
      await screen.findByTestId("swap-picker-pick-error"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "TKN" },
    });
    // A loader replaces the list (and the notice above it) until the
    // debounced search runs.
    expect(
      await screen.findByTestId("swap-picker-sections", undefined, {
        timeout: 2000,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId("swap-picker-pick-error"),
    ).not.toBeInTheDocument();
  });

  describe("when the search changes while the read is pending", () => {
    const tapThenSearch = async () => {
      let settle: { resolve: (n: number) => void; reject: (e: Error) => void } =
        { resolve: () => {}, reject: () => {} };
      const getDecimals = jest
        .spyOn(Soroban, "getDecimalsForAsset")
        .mockImplementation(
          () =>
            new Promise<number>((resolve, reject) => {
              settle = { resolve, reject };
            }),
        );
      const onClickAsset = renderPicker();
      fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));
      expect(getDecimals).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByTestId("swap-from-search"), {
        target: { value: "USDC" },
      });
      await screen.findByTestId("swap-picker-sections", undefined, {
        timeout: 2000,
      });
      return { onClickAsset, settle };
    };

    it("drops a late failure", async () => {
      const { settle } = await tapThenSearch();

      await act(async () => {
        settle.reject(new Error("rpc down"));
      });

      expect(
        screen.queryByTestId("swap-picker-pick-error"),
      ).not.toBeInTheDocument();
    });

    it("drops a late success", async () => {
      const { onClickAsset, settle } = await tapThenSearch();

      await act(async () => {
        settle.resolve(18);
      });

      expect(onClickAsset).not.toHaveBeenCalled();
    });
  });

  it("ignores a repeat tap while the read is pending", async () => {
    let resolve: (n: number) => void = () => {};
    const getDecimals = jest
      .spyOn(Soroban, "getDecimalsForAsset")
      .mockReturnValue(new Promise((r) => (resolve = r)));
    const onClickAsset = renderPicker();

    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));
    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));
    expect(getDecimals).toHaveBeenCalledTimes(1);

    resolve(18);
    await waitFor(() => expect(onClickAsset).toHaveBeenCalledTimes(1));
  });

  it("drops a late read when a newer pick was made", async () => {
    let resolve: (n: number) => void = () => {};
    jest
      .spyOn(Soroban, "getDecimalsForAsset")
      .mockReturnValue(new Promise((r) => (resolve = r)));
    const onClickAsset = renderPicker();

    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));
    fireEvent.click(screen.getByTestId("SwapTokenRow-AQUA-body"));
    expect(onClickAsset).toHaveBeenCalledTimes(1);
    expect(onClickAsset.mock.calls[0][0]).toBe("AQUA:G456");

    resolve(18);
    await new Promise((r) => setTimeout(r, 0));
    expect(onClickAsset).toHaveBeenCalledTimes(1);
  });
});

describe("SwapAsset destination: a held contract token found by another code", () => {
  const C1 = "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7";
  const heldSoroban = {
    token: { code: "SYM", issuer: { key: C1 } },
    contractId: C1,
    total: "1000000000000000000",
    decimals: 18,
  };

  afterEach(() => jest.restoreAllMocks());

  it("picks the held balance, without reading its decimals", async () => {
    const getDecimals = jest.spyOn(Soroban, "getDecimalsForAsset");
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          balances: { balances: [heldSoroban], icons: {} },
        },
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            // "abc" doesn't match the held row's symbol.
            yourTokens: [],
            popular: [],
            verified: [
              {
                canonical: `ABC:${C1}`,
                code: "ABC",
                issuer: C1,
                contract: C1,
                domain: null,
                isHeld: true,
                isContract: true,
                requiresTrustline: false,
              },
            ],
            unverified: [],
          },
          isSearch: true,
          isFallback: false,
        },
        error: null,
      },
    } as any);
    const onClickAsset = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={onClickAsset}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "abc" },
    });
    fireEvent.click(await screen.findByTestId("SwapTokenRow-ABC-body"));

    await waitFor(() => expect(onClickAsset).toHaveBeenCalledTimes(1));
    const [canonical, isContract, details] = onClickAsset.mock.calls[0];
    expect(canonical).toBe(`SYM:${C1}`);
    expect(isContract).toBe(true);
    expect(details).toMatchObject({
      tokenCode: "SYM",
      decimals: 18,
      requiresTrustline: false,
    });
    expect(getDecimals).not.toHaveBeenCalled();
  });
});

describe("SwapAsset destination: a pick before the account data resolves", () => {
  const CONTRACT = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";

  afterEach(() => jest.restoreAllMocks());

  it("reads the decimals with the active account's key", async () => {
    const getDecimals = jest
      .spyOn(Soroban, "getDecimalsForAsset")
      .mockResolvedValue(18);
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: { state: RequestState.LOADING, data: null, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            yourTokens: [],
            popular: [
              {
                canonical: `TKN:${CONTRACT}`,
                code: "TKN",
                issuer: CONTRACT,
                contract: CONTRACT,
                domain: null,
                isHeld: false,
                isContract: true,
                requiresTrustline: false,
              },
            ],
            verified: [],
            unverified: [],
          },
          isSearch: false,
          isFallback: false,
        },
        error: null,
      },
    } as any);
    const onClickAsset = jest.fn();
    render(
      <Wrapper
        state={{
          auth: {
            allAccounts: ["GACCOUNT"],
            publicKey: "GACCOUNT",
            applicationState: "MNEMONIC_PHRASE_CONFIRMED",
          },
        }}
        routes={["/"]}
      >
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={onClickAsset}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId("SwapTokenRow-TKN-body"));

    await waitFor(() => expect(onClickAsset).toHaveBeenCalledTimes(1));
    expect(getDecimals).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: "GACCOUNT" }),
    );
  });
});

describe("SwapAsset destination: View details", () => {
  const USDC_ISSUER =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const USDC = `USDC:${USDC_ISSUER}`;
  const usdcRecord = {
    canonical: USDC,
    code: "USDC",
    issuer: USDC_ISSUER,
    domain: "circle.com",
    image: "",
    isHeld: false,
    isContract: false,
    requiresTrustline: true,
  };

  const mockLookup = (popular: any[], yourTokens: any[] = []) => {
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: resolvedFromState,
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            yourTokens,
            popular,
            verified: popular,
            unverified: [],
          },
          isSearch: false,
          isFallback: false,
        },
        error: null,
      },
    } as any);
  };

  beforeEach(() => mockLookup([usdcRecord]));

  afterEach(() => jest.restoreAllMocks());

  const renderPicker = (
    priceHistory: boolean,
    mainnet = true,
    onClickAsset: jest.Mock = jest.fn(),
  ) =>
    render(
      <Wrapper
        state={{
          ...(mainnet
            ? { settings: { networkDetails: MAINNET_NETWORK_DETAILS } }
            : {}),
          remoteConfig: {
            isInitialized: true,
            use_balances_v2: false,
            use_token_price_history: priceHistory,
            maintenance_banner: { enabled: false, payload: undefined },
            maintenance_screen: { enabled: false, payload: undefined },
          },
        }}
        routes={["/"]}
      >
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={onClickAsset}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

  it("Swap to in the sheet picks the token as the row would, and closes the sheet", async () => {
    const onClickAsset = jest.fn();
    renderPicker(true, true, onClickAsset);

    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );
    const button = screen.getByTestId("asset-detail-swap-to-button");
    expect(button).toHaveTextContent("USDC");
    fireEvent.click(button);

    expect(onClickAsset).toHaveBeenCalledWith(
      USDC,
      false,
      expect.objectContaining({
        tokenCode: "USDC",
        issuer: USDC_ISSUER,
        requiresTrustline: true,
        source: "popular",
      }),
    );
    expect(screen.queryByTestId("asset-detail-sheet")).toBeNull();
  });

  it("opens the detail sheet for the chosen Popular row and keeps the search term", async () => {
    renderPicker(true);

    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "US" },
    });
    // The loader replaces the list from the keystroke until the debounced
    // lookup starts; wait for the searched list to come back.
    expect(screen.queryByTestId("swap-picker-sections")).toBeNull();
    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );

    expect(screen.getByTestId("asset-detail-sheet")).toHaveTextContent(USDC);
    expect(screen.getByTestId("swap-from-search")).toHaveValue("US");
  });

  it("hiding from the sheet reloads the picker and tells the caller which token left", async () => {
    const onAssetHiddenOrRemoved = jest.fn();
    const fromFetchData = jest.fn().mockResolvedValue(undefined);
    const heldUsdc = {
      ...usdcRecord,
      isHeld: true,
      requiresTrustline: false,
      tokenAmount: "12.5",
    };
    mockLookup([], [heldUsdc]);
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          balances: {
            balances: [
              {
                token: { code: "USDC", issuer: { key: USDC_ISSUER } },
                total: "12.5",
              },
            ],
            icons: {},
          },
        },
      },
      fetchData: fromFetchData,
      filterBalances: jest.fn(),
    } as any);
    render(
      <Wrapper
        state={{
          settings: { networkDetails: MAINNET_NETWORK_DETAILS },
          remoteConfig: {
            isInitialized: true,
            use_balances_v2: false,
            use_token_price_history: true,
            maintenance_banner: { enabled: false, payload: undefined },
            maintenance_screen: { enabled: false, payload: undefined },
          },
        }}
        routes={["/"]}
      >
        <SwapAsset
          selectionType="destination"
          hiddenAssets={[]}
          onClickAsset={jest.fn()}
          goBack={jest.fn()}
          onAssetHiddenOrRemoved={onAssetHiddenOrRemoved}
        />
      </Wrapper>,
    );
    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );
    const mountFetches = fromFetchData.mock.calls.length;

    fireEvent.click(screen.getByTestId("asset-detail-hide"));

    expect(onAssetHiddenOrRemoved).toHaveBeenCalledWith(USDC);
    // A hide only changes the hidden list, which the cached read applies.
    expect(fromFetchData.mock.calls.slice(mountFetches)).toEqual([[true, ""]]);
  });

  it("with a search typed, a hide re-runs the search on the reloaded balances", async () => {
    const reloaded = {
      ...resolvedFromState.data,
      balances: { balances: [], icons: {} },
      tokenPrices: {},
    };
    const fromFetchData = jest.fn().mockResolvedValue(reloaded);
    const lookupFetchData = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: resolvedFromState,
      fetchData: fromFetchData,
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: lookupFetchData,
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            yourTokens: [],
            popular: [],
            verified: [usdcRecord],
            unverified: [],
          },
          isSearch: true,
          isFallback: false,
        },
        error: null,
      },
    } as any);
    renderPicker(true);
    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "US" },
    });
    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );
    lookupFetchData.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("asset-detail-hide"));
    });

    expect(lookupFetchData).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: "US", balances: [] }),
    );
  });

  it("a search changed while the hide's reload is pending runs no lookup for the old term", async () => {
    const reloaded = {
      ...resolvedFromState.data,
      balances: { balances: [], icons: {} },
      tokenPrices: {},
    };
    let resolveReload: (v: unknown) => void = () => undefined;
    const fromFetchData = jest.fn().mockResolvedValue(undefined);
    const lookupFetchData = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: resolvedFromState,
      fetchData: fromFetchData,
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: lookupFetchData,
      state: {
        state: RequestState.SUCCESS,
        data: {
          sections: {
            yourTokens: [],
            popular: [],
            verified: [usdcRecord],
            unverified: [],
          },
          isSearch: true,
          isFallback: false,
        },
        error: null,
      },
    } as any);
    renderPicker(true);
    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "US" },
    });
    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );
    fromFetchData.mockImplementation(
      () => new Promise((resolve) => (resolveReload = resolve)),
    );

    fireEvent.click(screen.getByTestId("asset-detail-hide"));
    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "EU" },
    });
    lookupFetchData.mockClear();
    await act(async () => {
      resolveReload(reloaded);
    });

    expect(lookupFetchData).not.toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: "US" }),
    );
  });

  it("opens the detail sheet from a Your tokens row", async () => {
    const heldUsdc = {
      ...usdcRecord,
      isHeld: true,
      requiresTrustline: false,
      tokenAmount: "12.5",
    };
    mockLookup([], [heldUsdc]);
    // A funded account, or the picker treats it as new and hides Your tokens.
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          balances: {
            balances: [
              {
                token: { code: "USDC", issuer: { key: USDC_ISSUER } },
                total: "12.5",
              },
            ],
            icons: {},
          },
        },
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    renderPicker(true);

    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );

    expect(screen.getByTestId("asset-detail-sheet")).toHaveTextContent(USDC);
  });

  it.each([
    ["price history is off", false, true],
    ["off-mainnet", true, false],
  ])("offers no View details when %s", async (_name, priceHistory, mainnet) => {
    renderPicker(priceHistory, mainnet);

    fireEvent.click(await screen.findByTestId("SwapTokenRow-USDC-menu"));

    expect(screen.queryByTestId("SwapTokenRow-USDC-view-details")).toBeNull();
    expect(screen.getByTestId("SwapTokenRow-USDC-copy")).toBeInTheDocument();
  });

  it("offers View details only for a record that has an issuer", async () => {
    const { issuer: _issuer, ...noIssuer } = usdcRecord;
    mockLookup([
      usdcRecord,
      { ...noIssuer, canonical: "FOO", code: "FOO", issuer: undefined },
    ]);
    renderPicker(true);

    fireEvent.click(await screen.findByTestId("SwapTokenRow-FOO-menu"));
    expect(screen.queryByTestId("SwapTokenRow-FOO-view-details")).toBeNull();
    expect(screen.getByTestId("SwapTokenRow-FOO-copy")).toBeInTheDocument();

    expect(
      screen.getByTestId("SwapTokenRow-USDC-view-details"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("SwapTokenRow-USDC-menu")).toBeNull();
  });

  it("titles a classic record by code: a non-contract record's name is dropped", async () => {
    mockLookup([{ ...usdcRecord, name: `USDC:${USDC_ISSUER}` }]);
    renderPicker(true);

    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );

    expect(screen.getByTestId("asset-detail-sheet")).not.toHaveAttribute(
      "data-name",
    );
  });

  it("carries the record's search price to the sheet", async () => {
    mockLookup([{ ...usdcRecord, spotPrice: 0.99 }]);
    renderPicker(true);

    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-USDC-view-details"),
    );

    expect(screen.getByTestId("asset-detail-sheet")).toHaveAttribute(
      "data-spot-price",
      "0.99",
    );
  });

  it("keeps a contract record's name", async () => {
    const KALE_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
    mockLookup([
      {
        canonical: `KALE:${KALE_ID}`,
        code: "KALE",
        issuer: KALE_ID,
        name: "Kale",
        image: "",
        isHeld: false,
        isContract: true,
        requiresTrustline: false,
      },
    ]);
    renderPicker(true);

    fireEvent.click(
      await screen.findByTestId("SwapTokenRow-KALE-view-details"),
    );

    expect(screen.getByTestId("asset-detail-sheet")).toHaveAttribute(
      "data-name",
      "Kale",
    );
  });
});

describe("SwapAsset source: View details", () => {
  const USDC_ISSUER =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const heldUsdc = {
    token: { code: "USDC", issuer: { key: USDC_ISSUER } },
    total: "12.5",
  };

  beforeEach(() => {
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          balances: { balances: [heldUsdc], icons: {} },
          // The source picker lists the search-filtered held balances.
          filteredBalances: [heldUsdc],
        },
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: { state: RequestState.IDLE, data: null, error: null },
    } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  const renderSourcePicker = (
    priceHistory: boolean,
    onClickAsset = jest.fn(),
  ) =>
    render(
      <Wrapper
        state={{
          settings: { networkDetails: MAINNET_NETWORK_DETAILS },
          remoteConfig: {
            isInitialized: true,
            use_balances_v2: false,
            use_token_price_history: priceHistory,
            maintenance_banner: { enabled: false, payload: undefined },
            maintenance_screen: { enabled: false, payload: undefined },
          },
        }}
        routes={["/"]}
      >
        <SwapAsset
          selectionType="source"
          hiddenAssets={[]}
          onClickAsset={onClickAsset}
          goBack={jest.fn()}
        />
      </Wrapper>,
    );

  it("Swap from in the sheet picks the held token as its row would, and closes the sheet", () => {
    const onClickAsset = jest.fn();
    renderSourcePicker(true, onClickAsset);

    fireEvent.click(screen.getByTestId("SwapTokenRow-USDC-view-details"));
    const button = screen.getByTestId("asset-detail-swap-to-button");
    expect(button.getAttribute("data-side")).toBe("from");
    expect(button).toHaveTextContent("USDC");
    fireEvent.click(button);

    expect(onClickAsset).toHaveBeenCalledWith(`USDC:${USDC_ISSUER}`, false);
    expect(screen.queryByTestId("asset-detail-sheet")).toBeNull();
  });

  it("with a search typed, a hide reloads the source list with that search applied", async () => {
    const fromFetchData = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          balances: { balances: [heldUsdc], icons: {} },
          filteredBalances: [heldUsdc],
        },
      },
      fetchData: fromFetchData,
      filterBalances: jest.fn(),
    } as any);
    renderSourcePicker(true);
    fireEvent.change(screen.getByTestId("swap-from-search"), {
      target: { value: "US" },
    });
    fireEvent.click(screen.getByTestId("SwapTokenRow-USDC-view-details"));
    fromFetchData.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("asset-detail-hide"));
    });

    expect(fromFetchData).toHaveBeenCalledWith(true, "US");
  });

  it("offers no details on the source picker when price history is off", () => {
    renderSourcePicker(false);

    expect(screen.getByTestId("SwapTokenRow-USDC")).toBeInTheDocument();
    expect(screen.queryByTestId("SwapTokenRow-USDC-view-details")).toBeNull();
  });
});
