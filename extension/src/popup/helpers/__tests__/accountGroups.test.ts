import { Account, SecretSource, SecretSourceType } from "@shared/api/types";
import { WalletType } from "@shared/constants/hardwareWallet";

import {
  AccountGroupKind,
  getSourceLabel,
  groupAccountsBySource,
} from "../accountGroups";

const t = (key: string, options?: Record<string, unknown>) =>
  options?.number !== undefined
    ? key.replace("{{number}}", String(options.number))
    : key;

const phrase = (id: string, n: number, createdAt: number): SecretSource => ({
  id,
  type: SecretSourceType.PHRASE,
  label: `Seed Phrase ${n}`,
  createdAt,
});

const key = (id: string, n: number, createdAt: number): SecretSource => ({
  id,
  type: SecretSourceType.SECRET_KEY,
  label: `Secret Key ${n}`,
  createdAt,
});

const account = (id: string, sourceId?: string, extra = {}): Account => ({
  id,
  sourceId,
  publicKey: `G-${id}`,
  name: id,
  imported: false,
  ...extra,
});

const summarize = (groups: ReturnType<typeof groupAccountsBySource>) =>
  groups.map((g) => [g.kind, g.label, g.accounts.map((a) => a.id)]);

describe("getSourceLabel", () => {
  it("keeps the stored number and translates the rest", () => {
    expect(getSourceLabel(phrase("p", 3, 0), t)).toBe("Recovery phrase 3");
    expect(getSourceLabel(key("k", 2, 0), t)).toBe("Secret key 2");
  });

  it("falls back to the stored label when it has no number", () => {
    expect(getSourceLabel({ ...phrase("p", 1, 0), label: "Savings" }, t)).toBe(
      "Savings",
    );
  });
});

describe("groupAccountsBySource", () => {
  it("puts phrases first, then keys, then hardware, each oldest first", () => {
    const groups = groupAccountsBySource({
      sources: [key("k1", 1, 2), phrase("p2", 2, 3), phrase("p1", 1, 1)],
      accounts: [
        account("hw:G1", undefined, {
          hardwareWalletType: WalletType.LEDGER,
          imported: true,
        }),
        account("a3", "k1", { imported: true }),
        account("a1", "p1"),
        account("a2", "p2"),
        account("a4", "p1"),
      ],
      t,
    });

    expect(summarize(groups)).toEqual([
      [AccountGroupKind.PHRASE, "Recovery phrase 1", ["a1", "a4"]],
      [AccountGroupKind.PHRASE, "Recovery phrase 2", ["a2"]],
      [AccountGroupKind.SECRET_KEY, "Secret key 1", ["a3"]],
      [AccountGroupKind.HARDWARE, "Ledger", ["hw:G1"]],
    ]);
  });

  it("keeps an account with no known source instead of dropping it", () => {
    const groups = groupAccountsBySource({
      sources: [phrase("p1", 1, 1)],
      accounts: [account("a1", "p1"), account("a2"), account("a3", "gone")],
      t,
    });

    expect(summarize(groups)).toEqual([
      [AccountGroupKind.PHRASE, "Recovery phrase 1", ["a1"]],
      [AccountGroupKind.OTHER, "Other accounts", ["a2", "a3"]],
    ]);
  });

  it("leaves out a source with no accounts", () => {
    const groups = groupAccountsBySource({
      sources: [phrase("p1", 1, 1), key("k1", 1, 2)],
      accounts: [account("a1", "k1", { imported: true })],
      t,
    });

    expect(summarize(groups)).toEqual([
      [AccountGroupKind.SECRET_KEY, "Secret key 1", ["a1"]],
    ]);
  });
});
