import BigNumber from "bignumber.js";
import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/api/__tests__/fixtures/sac";
import { NotEnoughVariant } from "popup/constants/earn";

import {
  getNotEnoughVariant,
  hasSwappableBalance,
  isOnrampableAsset,
} from "../getNotEnoughVariant";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const EURC_ISSUER = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";

const classic = (code: string, issuer: string, total: string): AssetType =>
  ({
    token: { code, issuer: { key: issuer } },
    total: new BigNumber(total),
  }) as unknown as AssetType;

// `minimumBalance` is what the account must keep: 2 base reserves plus 0.5 per
// subentry. getAvailableBalance nets it and the fee out of the total.
const native = (total: string, minimumBalance = "1"): AssetType =>
  ({
    token: { code: "XLM", type: "native" },
    total: new BigNumber(total),
    minimumBalance: new BigNumber(minimumBalance),
  }) as unknown as AssetType;

const soroban = (contractId: string, total: string): AssetType =>
  ({
    contractId,
    total: new BigNumber(total),
  }) as unknown as AssetType;

describe("isOnrampableAsset", () => {
  it("allows curated assets on mainnet", () => {
    expect(isOnrampableAsset("XLM", MAINNET_NETWORK_DETAILS)).toBe(true);
    expect(isOnrampableAsset("USDC", MAINNET_NETWORK_DETAILS)).toBe(true);
  });

  it("rejects EURC — Coinbase does not list it", () => {
    // This is exactly why the designs show no Buy button on the EURC sheet.
    expect(isOnrampableAsset("EURC", MAINNET_NETWORK_DETAILS)).toBe(false);
  });

  it("rejects everything off mainnet", () => {
    // Testnet assets are worthless; an onramp link there is a dead end.
    expect(isOnrampableAsset("XLM", TESTNET_NETWORK_DETAILS)).toBe(false);
    expect(isOnrampableAsset("USDC", TESTNET_NETWORK_DETAILS)).toBe(false);
  });
});

describe("hasSwappableBalance", () => {
  const targetCanonical = `EURC:${EURC_ISSUER}`;
  const FEE = "0.00001";
  // Pays the swap's 0.00001 XLM fee and leaves nothing above the reserve.
  const feeOnlyXlm = native("1.00001");
  // EURC with an existing trustline: no new reserve to lock.
  const swappable = (balances: AssetType[], requiresTrustline = false) =>
    hasSwappableBalance({
      balances,
      targetCanonical,
      transactionFee: FEE,
      requiresTrustline,
    });

  it("counts native XLM above the minimum balance", () => {
    // isClassicBalance keys off `issuer`, which native lacks — regression guard
    // against excluding the most common swap source.
    expect(swappable([native("100")])).toBe(true);
  });

  it("does not count XLM held at the minimum balance", () => {
    // Every account holds XLM, but what the reserve locks can't be sold.
    expect(swappable([native("1")])).toBe(false);
    expect(swappable([native("1.000005")])).toBe(false);
  });

  it("counts a held classic asset", () => {
    expect(swappable([feeOnlyXlm, classic("USDC", USDC_ISSUER, "500")])).toBe(
      true,
    );
  });

  // Whatever is swapped, the swap's fee is paid in XLM.
  it("can't swap another token without the XLM to pay the fee", () => {
    const usdc = classic("USDC", USDC_ISSUER, "500");
    expect(swappable([usdc])).toBe(false);
    expect(swappable([native("1"), usdc])).toBe(false);
  });

  // XLM held only as its reserve can't pay for a swap into more XLM. The XLM
  // row has no issuer, so the picker passes an empty target.
  it("can't swap into XLM when the account's XLM is all reserve", () => {
    expect(
      hasSwappableBalance({
        balances: [native("1"), classic("USDC", USDC_ISSUER, "500")],
        targetCanonical: "",
        transactionFee: FEE,
        requiresTrustline: false,
      }),
    ).toBe(false);
  });

  it("ignores zero balances", () => {
    expect(swappable([feeOnlyXlm, classic("USDC", USDC_ISSUER, "0")])).toBe(
      false,
    );
  });

  it("ignores the target asset itself", () => {
    // A dust balance of the target must not read as "can swap into the target".
    expect(
      swappable([feeOnlyXlm, classic("EURC", EURC_ISSUER, "0.0001")]),
    ).toBe(false);
  });

  it("ignores Soroban-only balances", () => {
    // Swap builds a classic pathPaymentStrictSend and rejects contract assets.
    expect(swappable([feeOnlyXlm, soroban(PUBLIC_SACS.USDC!, "9")])).toBe(
      false,
    );
  });

  it("is false for an empty account", () => {
    expect(swappable([])).toBe(false);
  });

  describe("when the swap has to open a trustline", () => {
    it("needs more spendable XLM than the 0.5 XLM reserve to swap XLM", () => {
      expect(swappable([native("1.5")], true)).toBe(false);
      expect(swappable([native("1.6")], true)).toBe(true);
    });

    it("needs the reserve's XLM even when swapping another token", () => {
      // The reserve is locked whichever token is sold, so 500 USDC can't reach
      // EURC from an account at its minimum balance.
      const balances = [native("1.2"), classic("USDC", USDC_ISSUER, "500")];
      expect(swappable(balances, true)).toBe(false);
      expect(swappable(balances, false)).toBe(true);
    });

    it("lets another token pay once the reserve is covered", () => {
      expect(
        swappable([native("1.6"), classic("USDC", USDC_ISSUER, "500")], true),
      ).toBe(true);
    });
  });
});

describe("getNotEnoughVariant", () => {
  it.each([
    [true, true, NotEnoughVariant.BUY_SWAP_OR_TRANSFER],
    [true, false, NotEnoughVariant.BUY_OR_TRANSFER],
    [false, true, NotEnoughVariant.SWAP_OR_TRANSFER],
    [false, false, NotEnoughVariant.TRANSFER_ONLY],
  ])(
    "onrampable=%s swappable=%s -> %s",
    (isOnrampable, isSwappable, expected) => {
      expect(getNotEnoughVariant({ isOnrampable, isSwappable })).toBe(expected);
    },
  );
});

describe("the variants in the designs", () => {
  const balances = [native("1691"), classic("USDC", USDC_ISSUER, "500")];
  const networkDetails: NetworkDetails = MAINNET_NETWORK_DETAILS;

  // None of these accounts holds a trustline for the target.
  const variantFor = (code: string, canonical: string, held: AssetType[]) =>
    getNotEnoughVariant({
      isOnrampable: isOnrampableAsset(code, networkDetails),
      isSwappable: hasSwappableBalance({
        balances: held,
        targetCanonical: canonical,
        transactionFee: "0.00002",
        requiresTrustline: true,
      }),
    });

  it("EURC with holdings -> swap or transfer", () => {
    expect(variantFor("EURC", `EURC:${EURC_ISSUER}`, balances)).toBe(
      NotEnoughVariant.SWAP_OR_TRANSFER,
    );
  });

  it("USDC on an empty account -> buy or transfer", () => {
    expect(variantFor("USDC", `USDC:${USDC_ISSUER}`, [])).toBe(
      NotEnoughVariant.BUY_OR_TRANSFER,
    );
  });

  it("USDC with other holdings -> buy, swap or transfer", () => {
    expect(variantFor("USDC", `USDC:${USDC_ISSUER}`, [native("1691")])).toBe(
      NotEnoughVariant.BUY_SWAP_OR_TRANSFER,
    );
  });

  it("USDC with XLM only at the minimum balance -> buy or transfer", () => {
    // The account holds XLM, but none it can spend: offering Swap would end on
    // the swap's reserve sheet.
    expect(variantFor("USDC", `USDC:${USDC_ISSUER}`, [native("1")])).toBe(
      NotEnoughVariant.BUY_OR_TRANSFER,
    );
  });

  it("EURC on an empty account -> transfer only", () => {
    expect(variantFor("EURC", `EURC:${EURC_ISSUER}`, [])).toBe(
      NotEnoughVariant.TRANSFER_ONLY,
    );
  });
});
