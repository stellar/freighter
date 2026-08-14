import {
  filterEntriesByToken,
  filterHistoryEntries,
  resolveCanonicalToContractId,
} from "popup/helpers/history/filters";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  BalanceChangeRow,
  HistoryEntry,
  ResolvedToken,
} from "popup/views/AccountHistory/model";

const XLM_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

const xlm = (decimals: number | null = 7): ResolvedToken => ({
  code: "XLM",
  contractId: XLM_SAC,
  issuer: null,
  icon: null,
  decimals,
});

const received = (change: BalanceChangeRow): HistoryEntry =>
  ({
    id: "tx",
    kind: "received",
    createdAt: "2024-04-08T14:33:00Z",
    rowIcon: { type: "contract" },
    primaryText: "XLM",
    secondaryText: "Received",
    secondaryIcon: "received",
    amounts: null,
    details: {
      title: "Received XLM",
      status: "success",
      fee: "0.0000100",
      rate: null,
      contractId: null,
      functionName: null,
      protocol: null,
      counterparty: null,
      balanceChanges: [change],
      stateChangeCards: [],
      operations: [],
    },
  }) as HistoryEntry;

const filter = (entry: HistoryEntry) =>
  filterHistoryEntries([entry], {
    isHideDustEnabled: true,
    nativeTokenId: XLM_SAC,
  });

describe("filterHistoryEntries dust hiding", () => {
  it("hides a native credit at or below the dust threshold", () => {
    const entry = received({
      token: xlm(),
      amount: "0.05",
      direction: "credit",
    });
    expect(filter(entry)).toHaveLength(0);
  });

  it("keeps a native credit above the threshold", () => {
    const entry = received({
      token: xlm(),
      amount: "1.5",
      direction: "credit",
    });
    expect(filter(entry)).toHaveLength(1);
  });

  it("keeps an entry whose amount could not be scaled", () => {
    // an unknown token scale leaves the magnitude unknown, so it cannot be
    // classified as dust — hiding it would drop a row of unknown size
    const entry = received({
      token: xlm(null),
      amount: null,
      direction: "credit",
    });
    expect(filter(entry)).toHaveLength(1);
  });
});

describe("resolveCanonicalToContractId", () => {
  const USDC_ISSUER =
    "GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP";

  it("resolves 'native' to the network's native SAC", () => {
    expect(
      resolveCanonicalToContractId("native", MAINNET_NETWORK_DETAILS),
    ).toBe(XLM_SAC);
  });

  it("derives the SAC id for a classic CODE:ISSUER key", () => {
    // The deterministic Asset.contractId derivation — the same id the v2
    // wire uses as token_id for this asset.
    expect(
      resolveCanonicalToContractId(
        `USDC:${USDC_ISSUER}`,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe("CDXBCCWQPUSJQCPGWSEH3JKBRUIJSBCNGN52F7KSZ2OAVRE7KROKYLGZ");
  });

  it("passes a CODE:C... soroban key's contract id through", () => {
    const contractId =
      "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";
    expect(
      resolveCanonicalToContractId(
        `BLND:${contractId}`,
        MAINNET_NETWORK_DETAILS,
      ),
    ).toBe(contractId);
  });

  it("returns null for keys that cannot have a SAC id (LP shares, malformed)", () => {
    expect(
      resolveCanonicalToContractId("XLM:USDC:lp", MAINNET_NETWORK_DETAILS),
    ).toBeNull();
    expect(
      resolveCanonicalToContractId("garbage", MAINNET_NETWORK_DETAILS),
    ).toBeNull();
  });
});

describe("filterEntriesByToken", () => {
  // contractId is the SAC id USDC:GDFJHLAX... derives to on pubnet — the
  // token must carry the id the canonical key resolves to for a match.
  const usdc = (): ResolvedToken => ({
    code: "USDC",
    contractId: "CDXBCCWQPUSJQCPGWSEH3JKBRUIJSBCNGN52F7KSZ2OAVRE7KROKYLGZ",
    issuer: null,
    icon: null,
    decimals: 7,
  });
  const xlmEntry = received({
    token: xlm(),
    amount: "5",
    direction: "credit",
  });
  const usdcEntry = received({
    token: usdc(),
    amount: "5",
    direction: "credit",
  });

  it("keeps only the entries whose balance changes touch the asset", () => {
    expect(
      filterEntriesByToken(
        [xlmEntry, usdcEntry],
        "native",
        MAINNET_NETWORK_DETAILS,
      ),
    ).toEqual([xlmEntry]);
  });

  it("matches a trustline card for the asset even with no balance movement", () => {
    const trustlineEntry = {
      ...received({ token: xlm(), amount: "5", direction: "credit" }),
      details: {
        ...xlmEntry.details,
        balanceChanges: [],
        stateChangeCards: [
          {
            kind: "trustlines",
            verb: "created",
            entries: [{ token: usdc(), limitOld: null, limitNew: "1" }],
          },
        ],
      },
    } as HistoryEntry;

    const filtered = filterEntriesByToken(
      [trustlineEntry, xlmEntry],
      `USDC:GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP`,
      MAINNET_NETWORK_DETAILS,
    );
    expect(filtered).toEqual([trustlineEntry]);
  });

  it("filters an unresolvable key to nothing rather than to everything", () => {
    // Showing other assets' history under this asset would be a wrong
    // answer; an empty list is merely incomplete.
    expect(
      filterEntriesByToken(
        [xlmEntry, usdcEntry],
        "XLM:USDC:lp",
        MAINNET_NETWORK_DETAILS,
      ),
    ).toEqual([]);
  });
});
