/*
  A pre-V2 install's `browser.storage.local`, as the last single-phrase build
  (master before the Unified User Model v2 stack) left it. Used by
  `preV2Migration.test.ts` to prove the migration opens such a wallet with
  every account present.

  Shape it reproduces:
  - one phrase (`abandon ... about`) stamped into every keystore's `extra`,
    including the secret-key import, as builds before the provenance map did;
  - the global `keyDerivationNumber` counter, at 1;
  - no `secretSources`, `pinnedSourceId`, `derivationIndices`,
    `accountProvenance` or `storageVersion` 5.50.0.

  Accounts, in `keyIdList` order:
  - 0.8251530838260752: phrase index 0 (ACCOUNT_SOURCE_VECTORS[0].accounts[0]), active;
  - 0.718793021913283: phrase index 1 (ACCOUNT_SOURCE_VECTORS[0].accounts[1]);
  - 0.37048282749340133: an imported secret key, `extra.imported: true`;
  - hw:GBXMNIDFHHJ4KRVYVKWOPLKD4VTBINTOUGFBNV6R2UW4PT2DMJZN3PKD: a Ledger account.

  The keystores are real ScryptEncrypter blobs written by
  @stellar/typescript-wallet-sdk-km 5.0.0 under PRE_V2_PASSWORD. To regenerate,
  call `mockKeyManager.storeKey` (helpers/test-helpers.ts) with each account's
  key, `type: plaintextKey`, the `extra` above and that password, then copy
  `mockStorageApi.get(null)`. Keep the ids: tests reference them.
*/

export const PRE_V2_PASSWORD = "hunter2 hunter2";

export const PRE_V2_PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

export const PRE_V2_DERIVED_0_ID = "0.8251530838260752";
export const PRE_V2_DERIVED_1_ID = "0.718793021913283";
export const PRE_V2_IMPORTED_ID = "0.37048282749340133";
export const PRE_V2_IMPORTED_SECRET =
  "SDHOAMBNLGCE2MV5ZKIVZAQD3VCLGP53P3OBSBI6UN5L5XZI5TKHFQL4";
export const PRE_V2_IMPORTED_PUBLIC_KEY =
  "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
export const PRE_V2_HW_PUBLIC_KEY =
  "GBXMNIDFHHJ4KRVYVKWOPLKD4VTBINTOUGFBNV6R2UW4PT2DMJZN3PKD";
export const PRE_V2_HW_ID = `hw:${PRE_V2_HW_PUBLIC_KEY}`;

export const PRE_V2_KEYSTORES = {
  "stellarkeys:0.8251530838260752": {
    id: "0.8251530838260752",
    encryptedBlob:
      "AYj6Zdkb6WBjZgIhAyVHIHRm4Zm3ZR1cyFcifQuZnf2SqaXlMpgP/IjBHTFSImIB4s9nUboFiVfNtmqLiO9UUZ31JNda23lMumR1/FS9zXicDkK9Fb4GNJbVn1vq9hmVGqcu+cyCcc90zcfF49hUsrro5dfIC6gGnxCt3SmIegrpP3qb5R+NpKncQVQ5Xe6BISm9ZL2Je6v0qLiSIdNqisyH2Kip4KhNbDFTCZZP4ZPuaEYcwAZEvz21fmBLETKuDUETZ67q2FsXWDmdEfk8Q3GsNOhDd6wcyHpEfmyyX+5WBWv7pmwxFiQhYx1OvGfA3Sdh4CxGxoseRkOyooVZ0aXyEjwbFvohPMWhAifwhXZ1u1W5m02RX0Mp0vOA9EpOdzon+7XlQQqJGL8AJCj8TExsOyjF23V1ueSM0+Bvb0lU2h3ejuu5yNe4wnrxUTeLAsdctUTNeXNrx4I=",
    encrypterName: "ScryptEncrypter",
    salt: "bxscH1aQ/runMnS7dMkWowjg2wi6N1hL2ht/Wa7gt9E=",
  },
  "stellarkeys:0.718793021913283": {
    id: "0.718793021913283",
    encryptedBlob:
      "Aax4m+8KpdyskUuFlpg019UugUc/LqkSdYRa85HSNdOdnpJgMxOztXn1Qhkm+YyCJGCQeEDFpRNv2KDHJxGtWZBphCIKhx+FsG2fQqs1tsXgIEeIgxYokHN2+MF76ueH9XmYl4CbkeNPxlMEOj24CUuV/U4NOGCqtXknFrI/WOMbap/bsDbld3mu8P64aoWlZDoGwulSvxtihoiiGH/INFinMvDdLdfXTFJoBiQBYw4sFfvjqlNRMlKUgEGYE8Kj9KN31i0oYEN/o4KedESazjZ3aBRnmZDyCQbHv50E5mMxC6VfKVgSv46euhM5mCopk2hOhB+gu3PWpXw516kFsoEOuWXKFdDZu2SYzRYhKWOTmmf7bt9ejY3vRZGPsyIs8Kin8ymROU0WB5mrtp98r04YPysCxVlYw+lpoLrZEL7ODx5nEZ5P3G4XHVWnyfnu04idEMLtiPh4xDw=",
    encrypterName: "ScryptEncrypter",
    salt: "SonTSV6wUN14vHW1j+8+88wmUjbRr9rqksFPuC8xj4o=",
  },
  "stellarkeys:0.37048282749340133": {
    id: "0.37048282749340133",
    encryptedBlob:
      "AVy52Ztw79gMoEzNiQtsqmElUIoIcsVlAc6E18nRZUXQSctKjJaDOSmtWj9aIpZ4HSEWVWc9QzVT6AJOVce152IncxPte0yN2Vvyv1pWI2/YkRsFUkROkt0hGovGJr04Vn2MlBlwHDKGJKGo8hGoHwc6gAzgMhaAuHA3cdDkwVSg/Jm+OrS7XeQH4j/kox1nlERKw3vqnz6QhBmGGWszLgh36UNAbkAPiRPpXH0+5PiQht7KS/CWGl8KJEwa138KJk3XVz0mExCdvkWB/0xCEtE7+zjKtRZzZQDNZyxpRbUx0iHzI8LiP7mwjTOXIeuSAuDWFhNG2F7EJldqsfmVP0zUzJlzt/RWWTlUkYuiuU6y/AhkQapT7SLC7LdRHrOGp/Q0sSgha6GGGK7wWig8hP7+NDY6VQcNf0+wc82eFTklQwQ4/isBhWoKn4jwZtbhGp5wy5d3mZT/vw==",
    encrypterName: "ScryptEncrypter",
    salt: "MWem8hULKCZoCC/I4fmxhRYcRT9R1XW6F3UVuRXgNZU=",
  },
};

export const PRE_V2_STORAGE: Record<string, unknown> = {
  ...PRE_V2_KEYSTORES,
  keyIdList: [
    PRE_V2_DERIVED_0_ID,
    PRE_V2_DERIVED_1_ID,
    PRE_V2_IMPORTED_ID,
    PRE_V2_HW_ID,
  ],
  keyId: PRE_V2_DERIVED_0_ID,
  keyDerivationNumber: "1",
  // encodeObject({ [id]: name }) of the four accounts' names.
  accountNameList:
    "eyIwLjgyNTE1MzA4MzgyNjA3NTIiOiJBY2NvdW50IDEiLCIwLjcxODc5MzAyMTkxMzI4MyI6IkFjY291bnQgMiIsIjAuMzcwNDgyODI3NDkzNDAxMzMiOiJBY2NvdW50IDMiLCJodzpHQlhNTklERkhISjRLUlZZVktXT1BMS0Q0VlRCSU5UT1VHRkJOVjZSMlVXNFBUMkRNSlpOM1BLRCI6IkxlZGdlciAxIn0=",
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  storageVersion: "5.33.5",
  [PRE_V2_HW_ID]: {
    bipPath: "44'/148'/0'",
    publicKey: PRE_V2_HW_PUBLIC_KEY,
  },
};
