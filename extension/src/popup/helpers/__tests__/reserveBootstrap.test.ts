import { Networks } from "stellar-sdk";

import {
  ReserveSendError,
  canClaimBalance,
  horizonAssetToCanonical,
  pickBootstrapOptions,
  quoteAndBuildBootstrap,
} from "../reserve";

const CLAIMANT = "GDTO3QIHYEA4KU6QEJP7Q5NEDMVLOZ56XS752XRVP6GMRRBS34OT2L6X";
const OTHER = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";
const ISSUER = "GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";
const USDC = `USDC:${ISSUER}`;
const EURC = `EURC:${ISSUER}`;

describe("reserve bootstrap options", () => {
  it("reads Horizon assets", () => {
    expect(horizonAssetToCanonical("native")).toEqual({
      asset: "native",
      code: "XLM",
      issuer: "",
    });
    expect(horizonAssetToCanonical(USDC)).toEqual({
      asset: USDC,
      code: "USDC",
      issuer: ISSUER,
    });
  });

  it("only lists claimables this address can claim in an accepted token", () => {
    const options = pickBootstrapOptions({
      claimant: CLAIMANT,
      acceptedTokens: [USDC],
      records: [
        {
          id: "usdc-big",
          asset: USDC,
          amount: "10.0000000",
          claimants: [{ destination: CLAIMANT, predicate: { unconditional: true } }],
        },
        {
          id: "usdc-small",
          asset: USDC,
          amount: "25.0000000",
          claimants: [{ destination: CLAIMANT, predicate: { unconditional: true } }],
        },
        {
          id: "eurc",
          asset: EURC,
          amount: "40.0000000",
          claimants: [{ destination: CLAIMANT }],
        },
        {
          id: "someone-else",
          asset: USDC,
          amount: "99.0000000",
          claimants: [{ destination: OTHER }],
        },
      ],
    });

    expect(options).toEqual([
      {
        asset: USDC,
        code: "USDC",
        issuer: ISSUER,
        available: "25.0000000",
        balanceId: "usdc-small",
      },
    ]);
  });

  it("keeps the largest claimable per accepted token", () => {
    expect(
      canClaimBalance(
        {
          id: "1",
          asset: USDC,
          amount: "1",
          claimants: [
            { destination: CLAIMANT, predicate: { unconditional: true } },
          ],
        },
        CLAIMANT,
      ),
    ).toBe(true);
    expect(
      canClaimBalance(
        {
          id: "1",
          asset: USDC,
          amount: "1",
          claimants: [
            {
              destination: CLAIMANT,
              predicate: { abs_before: "2020-01-01T00:00:00Z" } as any,
            },
          ],
        },
        CLAIMANT,
      ),
    ).toBe(false);
    expect(
      canClaimBalance(
        { id: "1", asset: USDC, amount: "1", claimants: [] },
        CLAIMANT,
      ),
    ).toBe(false);
  });
});

describe("quoteAndBuildBootstrap guards", () => {
  const option = {
    asset: USDC,
    code: "USDC",
    issuer: ISSUER,
    available: "25.0000000",
    balanceId: "00".repeat(36),
  };

  it("is a ReserveSendError on networks Reserve does not host", async () => {
    await expect(
      quoteAndBuildBootstrap({
        publicKey: CLAIMANT,
        option,
        networkPassphrase: Networks.FUTURENET,
        client: null,
      }),
    ).rejects.toBeInstanceOf(ReserveSendError);
  });

  it("refuses a zero claimable", async () => {
    await expect(
      quoteAndBuildBootstrap({
        publicKey: CLAIMANT,
        option: { ...option, available: "0" },
        networkPassphrase: Networks.TESTNET,
      }),
    ).rejects.toMatchObject({
      i18nKey: "The waiting {{asset}} is not enough to open this account.",
    });
  });

  it("is a ReserveSendError when Reserve is not configured", async () => {
    await expect(
      quoteAndBuildBootstrap({
        publicKey: CLAIMANT,
        option,
        networkPassphrase: Networks.TESTNET,
        client: null,
      }),
    ).rejects.toBeInstanceOf(ReserveSendError);
  });
});
