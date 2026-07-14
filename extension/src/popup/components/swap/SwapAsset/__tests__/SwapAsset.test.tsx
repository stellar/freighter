import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import * as UseSwapFromData from "popup/components/swap/SwapAsset/hooks/useSwapFromData";
import * as UseSwapTokenLookup from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";
import { SwapAsset } from "popup/components/swap/SwapAsset";

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
  hadSorobanMatches: false,
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
          hadSorobanMatches: false,
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
