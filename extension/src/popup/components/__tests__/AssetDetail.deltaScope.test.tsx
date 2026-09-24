import React from "react";
import { render, screen, act } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { AssetDetail } from "popup/components/account/AssetDetail";
import { ROUTES } from "popup/constants/routes";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as ApiInternal from "@shared/api/internal";
import { mockAccounts, Wrapper } from "popup/__testHelpers__";
import { PriceDirection } from "popup/components/account/TokenPriceChart/constants";
import type { RangeDeltaState } from "popup/components/account/TokenPriceChart";
import { AppDataType } from "helpers/hooks/useGetAppData";

// The real chart reports `isLoading: true` from its mount effect, which RTL
// flushes inside `act` — so the parent's stale render between a scope change
// and that report is invisible to it. A stub that never reports makes the
// header's own handling of a scope change the only thing on trial.
let reportDelta: ((delta: RangeDeltaState) => void) | null = null;
jest.mock("popup/components/account/TokenPriceChart", () => ({
  ...jest.requireActual("popup/components/account/TokenPriceChart"),
  TokenPriceChart: ({
    onDeltaChange,
  }: {
    onDeltaChange: (delta: RangeDeltaState) => void;
  }) => {
    reportDelta = onDeltaChange;
    return <div data-testid="TokenPriceChart" />;
  },
}));

jest
  .spyOn(ApiInternal, "getTokenPrices")
  .mockImplementation(() => Promise.resolve({}));
jest
  .spyOn(ApiInternal, "getAssetDomains")
  .mockImplementation(() => Promise.resolve({} as any));
jest
  .spyOn(ApiInternal, "getTokenStats")
  .mockImplementation(() => Promise.resolve({} as any));

const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
const SOROBAN_ASSET = `TKN:${CONTRACT_ID}`;

const balances = [
  {
    available: new BigNumber(10),
    token: { type: "native", code: "XLM" },
    total: new BigNumber(10),
  },
  {
    token: { code: "TKN", issuer: { key: CONTRACT_ID } },
    contractId: CONTRACT_ID,
    total: new BigNumber(100),
    decimals: 7,
    name: "Token",
    symbol: "TKN",
  },
];

const makeProps = (selectedAsset: string) =>
  ({
    handleClose: () => null,
    accountBalances: { balances },
    selectedAsset,
    historyData: { type: AppDataType.RESOLVED, operationsByAsset: {} },
  }) as any;

const state = {
  auth: {
    error: null,
    applicationState: ApplicationState.PASSWORD_CREATED,
    publicKey: "G1",
    allAccounts: mockAccounts,
  },
  settings: { networkDetails: MAINNET_NETWORK_DETAILS },
  remoteConfig: { isInitialized: true, use_token_price_history: true },
  cache: {
    tokenPrices: {
      [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
        G1: { native: { currentPrice: "0.27", percentagePriceChange24h: "1" } },
      },
    },
  },
};

describe("AssetDetail header delta scope", () => {
  afterEach(() => {
    reportDelta = null;
  });

  it("never carries one token's delta into another token's header", async () => {
    const { rerender } = render(
      <Wrapper routes={[ROUTES.account]} state={state}>
        <AssetDetail {...makeProps("native")} />
      </Wrapper>,
    );
    const delta = () => screen.getByTestId("AssetDetail__delta");

    act(() => {
      reportDelta!({
        isLoading: false,
        text: "+$0.0014 (0.86%)",
        colorClass: PriceDirection.Positive,
      });
    });
    expect(delta().textContent).toBe("+$0.0014 (0.86%)");

    // Same parent instance, new (network, token) scope. The chart remounts
    // and has reported nothing yet, so the header must show its placeholder
    // — not XLM's number under TKN's title.
    rerender(
      <Wrapper routes={[ROUTES.account]} state={state}>
        <AssetDetail {...makeProps(SOROBAN_ASSET)} />
      </Wrapper>,
    );
    expect(screen.getByTestId("TokenPriceChart")).toBeInTheDocument();
    expect(delta().textContent).toBe("");
    expect(delta().querySelector(".AssetDetail__delta-ghost")).not.toBeNull();
    expect(delta().className).not.toContain(PriceDirection.Positive);

    // Let the stats card's resolved fetch land inside act.
    await act(async () => {
      await Promise.resolve();
    });
  });
});
