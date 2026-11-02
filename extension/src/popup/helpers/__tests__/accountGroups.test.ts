import { Account } from "@shared/api/types";
import { WalletType } from "@shared/constants/hardwareWallet";

import { AccountGroupKind, groupAccounts } from "popup/helpers/accountGroups";

const DERIVED_1 = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";
const DERIVED_2 = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const IMPORTED_1 = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL";
const IMPORTED_2 = "GA7YNBW5CBTJZ3ZZOWX3ZNBKD6OE7A7IHUQVWMY62W2ZBG2SGZVOOPVH";
const LEDGER = "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

const accounts = [
  { publicKey: DERIVED_1, name: "Account 1", imported: false },
  { publicKey: IMPORTED_1, name: "Account 2", imported: true },
  { publicKey: DERIVED_2, name: "Account 3", imported: false },
  {
    publicKey: LEDGER,
    name: "Account 4",
    imported: false,
    hardwareWalletType: WalletType.LEDGER,
  },
  { publicKey: IMPORTED_2, name: "Account 5", imported: true },
] as Account[];

const identity = (key: string, options?: Record<string, unknown>) =>
  options?.number !== undefined
    ? key.replace("{{number}}", String(options.number))
    : key;

describe("groupAccounts", () => {
  it("puts derived accounts under the phrase and each import in its own group", () => {
    const groups = groupAccounts(accounts, identity);

    expect(
      groups.map(({ label, kind, accounts: members }) => [
        label,
        kind,
        members.map(({ publicKey }) => publicKey),
      ]),
    ).toEqual([
      [
        "Recovery phrase 1",
        AccountGroupKind.RecoveryPhrase,
        [DERIVED_1, DERIVED_2],
      ],
      ["Secret key 1", AccountGroupKind.SecretKey, [IMPORTED_1]],
      ["Secret key 2", AccountGroupKind.SecretKey, [IMPORTED_2]],
      ["Ledger", AccountGroupKind.Hardware, [LEDGER]],
    ]);
  });

  it("numbers a lone imported key too", () => {
    const groups = groupAccounts(accounts.slice(0, 3), identity);

    expect(groups.map(({ label }) => label)).toEqual([
      "Recovery phrase 1",
      "Secret key 1",
    ]);
  });

  it("keeps each group's key stable when accounts are reordered", () => {
    const keys = groupAccounts(accounts, identity).map(({ key }) => key);
    const reversed = groupAccounts([...accounts].reverse(), identity).map(
      ({ key }) => key,
    );

    expect([...reversed].sort()).toEqual([...keys].sort());
  });
});
