import { Account, SecretSource, SecretSourceType } from "@shared/api/types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export enum AccountGroupKind {
  PHRASE = "phrase",
  SECRET_KEY = "secretKey",
  HARDWARE = "hardware",
  OTHER = "other",
}

export interface AccountGroup {
  key: string;
  kind: AccountGroupKind;
  label: string;
  /** The source that roots every account in the group; none for hardware. */
  sourceId?: string;
  accounts: Account[];
}

/*
  The background numbers each source within its type when it is added
  ("Seed Phrase 2", "Secret Key 1") and never reuses a number. The popup keeps
  that number and translates the rest.
*/
const getLabelNumber = (label: string) => /(\d+)$/.exec(label)?.[1];

export const getSourceLabel = (source: SecretSource, t: Translate) => {
  const number = getLabelNumber(source.label);

  if (!number) {
    return source.label;
  }

  return source.type === SecretSourceType.PHRASE
    ? t("Recovery phrase {{number}}", { number })
    : t("Secret key {{number}}", { number });
};

/**
 * Groups accounts under the source that roots them: phrases first, then
 * imported keys, each oldest first, then hardware accounts by device. Every
 * account appears exactly once. One with no known source (a pre-V2 account
 * the migration has not attributed) lands in a trailing group rather than
 * being dropped. Empty groups are left out.
 */
export const groupAccountsBySource = ({
  accounts,
  sources,
  t,
}: {
  accounts: Account[];
  sources: SecretSource[];
  t: Translate;
}): AccountGroup[] => {
  const byAge = [...sources].sort((a, b) => a.createdAt - b.createdAt);
  const ordered = [
    ...byAge.filter((s) => s.type === SecretSourceType.PHRASE),
    ...byAge.filter((s) => s.type === SecretSourceType.SECRET_KEY),
  ];
  const known = new Set(ordered.map((s) => s.id));

  const groups: AccountGroup[] = ordered.map((source) => ({
    key: source.id,
    kind:
      source.type === SecretSourceType.PHRASE
        ? AccountGroupKind.PHRASE
        : AccountGroupKind.SECRET_KEY,
    label: getSourceLabel(source, t),
    sourceId: source.id,
    accounts: accounts.filter(
      (acct) => !acct.hardwareWalletType && acct.sourceId === source.id,
    ),
  }));

  const hardware = accounts.filter((acct) => !!acct.hardwareWalletType);
  if (hardware.length) {
    groups.push({
      key: "hardware",
      kind: AccountGroupKind.HARDWARE,
      label: hardware[0].hardwareWalletType || t("Hardware wallet"),
      accounts: hardware,
    });
  }

  const unattributed = accounts.filter(
    (acct) =>
      !acct.hardwareWalletType && !(acct.sourceId && known.has(acct.sourceId)),
  );
  if (unattributed.length) {
    groups.push({
      key: "other",
      kind: AccountGroupKind.OTHER,
      label: t("Other accounts"),
      accounts: unattributed,
    });
  }

  return groups.filter((group) => group.accounts.length);
};
