import React from "react";
import { render, screen } from "@testing-library/react";

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

  it("source: renders the 'Swap from' header and the held TokenList", () => {
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

    expect(screen.getByText("Swap from")).toBeInTheDocument();
    expect(screen.getByTestId("token-list")).toBeInTheDocument();
    expect(screen.queryByTestId("swap-picker-sections")).toBeNull();
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
});
