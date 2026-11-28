import { AccountPositions } from "@shared/api/types/blend";
import { PUBLIC_SACS } from "@shared/api/__tests__/fixtures/sac";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { hasDepositLanded } from "popup/components/earn/helpers/awaitedDeposit";
import {
  AwaitedDeposit,
  initialState,
  reducer,
  resetEarn,
  saveAwaitedDeposit,
} from "popup/ducks/earn";

const AWAITED: AwaitedDeposit = {
  publicKey: "GABC",
  network: "PUBLIC",
  poolId: "CPOOL",
  assetId: "CUSDC",
  // 100 held before, 50 deposited.
  minTokens: "125",
  expiresAt: 0,
};

const positions = (
  totalTokens: string,
  {
    poolId = "CPOOL",
    assetId = "CUSDC",
    name = null as string | null,
    decimals = 7 as number | null,
  } = {},
): AccountPositions => ({
  address: "GABC",
  totalValueUsd: null,
  netApy: null,
  backstop: [],
  positions: [
    {
      protocol: "blend",
      id: poolId,
      name: null,
      netUsd: null,
      suppliedUsd: null,
      borrowedUsd: null,
      netApy: null,
      blend: {
        supply: [
          {
            assetId,
            symbol: null,
            name,
            decimals,
            suppliedTokens: "0",
            collateralTokens: totalTokens,
            totalTokens,
            usdValue: null,
            apy: null,
            emissionsApr: null,
            interestEarned: "0",
            interestEarnedUsd: null,
            claimableBlnd: "0",
            claimableUsd: null,
            priceUsd: null,
          },
        ],
        borrow: [],
      },
    },
  ],
});

describe("hasDepositLanded", () => {
  it("is true once the reserve holds the deposit", () => {
    expect(
      hasDepositLanded(
        positions("1500000000"),
        AWAITED,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(true);
  });

  // Interest alone nudges the amount up on every read; it must not pass for
  // the deposit.
  it("is false while only interest has accrued", () => {
    expect(
      hasDepositLanded(
        positions("1000012345"),
        AWAITED,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(false);
  });

  it("is false while the reserve is not there at all", () => {
    expect(
      hasDepositLanded(
        positions("1500000000", { assetId: "CXLM" }),
        AWAITED,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(false);
    expect(
      hasDepositLanded(
        positions("1500000000", { poolId: "COTHER" }),
        AWAITED,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(false);
  });

  it("reads a SAC with no reported scale as 7 decimals", () => {
    const usdc = PUBLIC_SACS.USDC!;
    expect(
      hasDepositLanded(
        positions("1500000000", {
          assetId: usdc,
          name: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          decimals: null,
        }),
        { ...AWAITED, assetId: usdc },
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(true);
  });

  it("keeps waiting for a Soroban-only token of unknown scale", () => {
    // Unmeasurable, so the wait runs to its timeout; each read still lands.
    expect(
      hasDepositLanded(
        positions("1500000000", { decimals: null }),
        AWAITED,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(false);
  });
});

describe("the earn reset", () => {
  // The flow resets as it closes, which is when Home starts waiting.
  it("keeps the awaited deposit for Home", () => {
    const state = reducer(initialState, saveAwaitedDeposit(AWAITED));
    expect(reducer(state, resetEarn()).awaitedDeposit).toEqual(AWAITED);
  });
});
