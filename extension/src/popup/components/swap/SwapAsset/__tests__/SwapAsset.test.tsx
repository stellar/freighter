import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { captureException } from "@sentry/browser";

import { Wrapper } from "popup/__testHelpers__";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import * as UseSwapFromData from "popup/components/swap/SwapAsset/hooks/useSwapFromData";
import * as UseSwapTokenLookup from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";
import * as Soroban from "popup/helpers/soroban";
import { SwapAsset } from "popup/components/swap/SwapAsset";

jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

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
