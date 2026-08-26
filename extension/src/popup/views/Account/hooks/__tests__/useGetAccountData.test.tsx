import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AccountPositions } from "@shared/api/types/blend";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";

import * as GetAppDataHooks from "helpers/hooks/useGetAppData";
import * as GetBalancesHooks from "helpers/hooks/useGetBalances";
import * as GetCollectiblesHooks from "helpers/hooks/useGetCollectibles";
import * as GetPositionsHooks from "helpers/hooks/useGetPositions";
import * as GetTokenPricesHooks from "helpers/hooks/useGetTokenPrices";
import * as BlendHelpers from "@shared/api/helpers/blend";
import * as ApiInternal from "@shared/api/internal";

import { useGetAccountData } from "../useGetAccountData";

// The first (unscanned) balances read Home shows immediately; distinguished
// from the scanned read below by `icons`, a field neither read nor written
// anywhere else in this flow -- a plain, unambiguous marker of "which read
// survived to the end", standing in for what a real Blockaid flag does on
// `balances[].blockaidData`.
const UNSCANNED_BALANCES = {
  balances: [],
  isFunded: true,
  subentryCount: 1,
} as AccountBalances;

const SCANNED_BALANCES = {
  balances: [],
  isFunded: true,
  subentryCount: 1,
  icons: { scanned: "marker" },
} as AccountBalances;

const ZERO_POSITIONS: AccountPositions = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: null,
  netApy: null,
  positions: [],
  backstop: [],
};

jest.spyOn(GetAppDataHooks, "useGetAppData").mockReturnValue({
  state: {} as any,
  fetchData: () =>
    Promise.resolve({
      type: AppDataType.RESOLVED,
      account: {
        publicKey: TEST_PUBLIC_KEY,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      },
      settings: {
        networkDetails: MAINNET_NETWORK_DETAILS,
        allowList: {},
      },
    }) as any,
} as any);

// The 5th positional arg (`shouldSkipScan`) is exactly what separates Home's
// first, quick balances read from the later Blockaid-scanned one -- see
// `useGetAccountData.tsx`'s two `fetchBalances` call sites.
jest.spyOn(GetBalancesHooks, "useGetBalances").mockReturnValue({
  state: {} as any,
  fetchData: (
    _publicKey: string,
    _isMainnetNetwork: boolean,
    _networkDetails: unknown,
    _useCache?: boolean,
    shouldSkipScan?: boolean,
  ) => Promise.resolve(shouldSkipScan ? UNSCANNED_BALANCES : SCANNED_BALANCES),
} as any);

jest.spyOn(GetCollectiblesHooks, "useGetCollectibles").mockReturnValue({
  state: {} as any,
  fetchData: () => Promise.resolve({ collections: [] }),
} as any);

// Zero positions (not an error) is the exact population the regression
// affects: it is what makes `earnOptionsRequest` non-null, which is what
// lands a dispatch after the mainnet rescan block.
jest.spyOn(GetPositionsHooks, "useGetPositions").mockReturnValue({
  state: {} as any,
  fetchData: () => Promise.resolve(ZERO_POSITIONS),
} as any);

jest.spyOn(GetTokenPricesHooks, "useGetTokenPrices").mockReturnValue({
  state: {} as any,
  fetchData: () => Promise.resolve({ tokenPrices: {} }) as any,
} as any);

jest.spyOn(BlendHelpers, "getBlendPools").mockResolvedValue([]);
jest.spyOn(BlendHelpers, "getBlendEarnOptions").mockResolvedValue([]);

jest.spyOn(ApiInternal, "loadBackendSettings").mockResolvedValue({
  isSorobanPublicEnabled: true,
  isRpcHealthy: true,
  userNotification: { enabled: false, message: "" },
} as any);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={makeDummyStore({})}>{children}</Provider>
);

describe("useGetAccountData", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Regression: I3 moved the earnOptions landing to after the mainnet
  // scanned-balances block so it would stop sitting in front of that scan.
  // But the scan dispatches a throwaway `scannedPayload` local rather than
  // updating `payload` itself, so the earnOptions dispatch that follows
  // spreads the still-unscanned `payload` -- and the reducer fully replaces
  // state per dispatch (helpers/request.ts), so that silently reverts
  // `balances`/`isScanAppended` right after the scan lands. Affects every
  // mainnet account with zero Blend positions (no error, empty list) -- the
  // only population for which `earnOptionsRequest` is non-null.
  it("keeps the Blockaid-scanned balances after the earnOptions dispatch that follows it", async () => {
    const { result } = renderHook(
      () => useGetAccountData({ showHidden: false, includeIcons: false }),
      { wrapper },
    );

    await act(async () => {
      await result.current.fetchData({ useAppDataCache: false });
    });

    const resolved = result.current.state.data as any;

    expect(resolved.isScanAppended).toBe(true);
    expect(resolved.balances).toEqual(SCANNED_BALANCES);
  });
});
