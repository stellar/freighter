import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/constants/sac";
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
    total,
  }) as unknown as AssetType;

const native = (total: string): AssetType =>
  ({
    token: { code: "XLM", type: "native" },
    total,
  }) as unknown as AssetType;

const soroban = (contractId: string, total: string): AssetType =>
  ({
    contractId,
    total,
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
  const target = `EURC:${EURC_ISSUER}`;

  it("counts native XLM", () => {
    // isClassicBalance keys off `issuer`, which native lacks — regression guard
    // against excluding the most common swap source.
    expect(hasSwappableBalance([native("100")], target)).toBe(true);
  });

  it("counts a held classic asset", () => {
    expect(
      hasSwappableBalance([classic("USDC", USDC_ISSUER, "500")], target),
    ).toBe(true);
  });

  it("ignores zero balances", () => {
    expect(
      hasSwappableBalance(
        [native("0"), classic("USDC", USDC_ISSUER, "0")],
        target,
      ),
    ).toBe(false);
  });

  it("ignores the target asset itself", () => {
    // A dust balance of the target must not read as "can swap into the target".
    expect(
      hasSwappableBalance([classic("EURC", EURC_ISSUER, "0.0001")], target),
    ).toBe(false);
  });

  it("ignores Soroban-only balances", () => {
    // Swap builds a classic pathPaymentStrictSend and rejects contract assets.
    expect(hasSwappableBalance([soroban(PUBLIC_SACS.USDC!, "9")], target)).toBe(
      false,
    );
  });

  it("is false for an empty account", () => {
    expect(hasSwappableBalance([], target)).toBe(false);
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

describe("the three variants in the designs", () => {
  const balances = [native("1691"), classic("USDC", USDC_ISSUER, "500")];
  const networkDetails: NetworkDetails = MAINNET_NETWORK_DETAILS;

  const variantFor = (code: string, canonical: string, held: AssetType[]) =>
    getNotEnoughVariant({
      isOnrampable: isOnrampableAsset(code, networkDetails),
      isSwappable: hasSwappableBalance(held, canonical),
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

  it("EURC on an empty account -> transfer only", () => {
    expect(variantFor("EURC", `EURC:${EURC_ISSUER}`, [])).toBe(
      NotEnoughVariant.TRANSFER_ONLY,
    );
  });
});
