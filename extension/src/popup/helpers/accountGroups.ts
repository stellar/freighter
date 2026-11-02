import { Account } from "@shared/api/types";

export enum AccountGroupKind {
  RecoveryPhrase = "recoveryPhrase",
  SecretKey = "secretKey",
  Hardware = "hardware",
}

export interface AccountGroup {
  /** Stable across renders and sheet reopenings; keys collapsed state. */
  key: string;
  kind: AccountGroupKind;
  label: string;
  accounts: Account[];
}

/*
  Groups accounts by what roots them, for the account switcher and Accounts &
  recovery. Until accounts carry a source id, this is all the base branch can
  tell: every phrase-derived account comes from the wallet's one phrase, each
  imported account is its own secret key, and a hardware account is grouped
  by its device. Labels are numbered within their own kind.
*/
export const groupAccounts = (
  accounts: Account[],
  t: (key: string, options?: Record<string, unknown>) => string,
): AccountGroup[] => {
  const derived = accounts.filter(
    (acct) => !acct.imported && !acct.hardwareWalletType,
  );
  const imported = accounts.filter(
    (acct) => acct.imported && !acct.hardwareWalletType,
  );
  const hardware = accounts.filter((acct) => !!acct.hardwareWalletType);

  const groups: AccountGroup[] = [];

  if (derived.length) {
    groups.push({
      key: "phrase-1",
      kind: AccountGroupKind.RecoveryPhrase,
      label: t("Recovery phrase {{number}}", { number: 1 }),
      accounts: derived,
    });
  }

  imported.forEach((acct, i) => {
    groups.push({
      key: `secret-key-${acct.publicKey}`,
      kind: AccountGroupKind.SecretKey,
      label: t("Secret key {{number}}", { number: i + 1 }),
      accounts: [acct],
    });
  });

  if (hardware.length) {
    groups.push({
      key: "hardware",
      kind: AccountGroupKind.Hardware,
      label: hardware[0].hardwareWalletType || t("Hardware wallet"),
      accounts: hardware,
    });
  }

  return groups;
};
