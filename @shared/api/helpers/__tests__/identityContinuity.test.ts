import { Buffer } from "buffer";
import { mnemonicToSeedSync } from "bip39";
import StellarHDWallet from "stellar-hd-wallet";
import { Keypair } from "stellar-sdk";

import {
  AUTH_SALT,
  deriveAuthKeypair,
  deriveSourceIdentity,
} from "../deriveAuthKeypair";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "../authKeypairVectors";

/*
  IDENTITY CONTINUITY GUARD. This test is the reason deriveAuthKeypair is
  frozen.

  deriveAuthKeypair(mnemonic).userId is the `metrics_user_id` of every shipped
  phrase wallet, and the server roots each wallet's cluster at the phrase that
  signed its first link. If the derivation moves, every existing user's
  analytics identity moves with it and nothing else fails.

  The expected values are literals, not reads of authKeypairVectors.ts, so a
  change to the derivation cannot pass by regenerating the vectors. If this
  fails, fix the derivation. Do not update the values.
*/
const FROZEN_PHRASE_USER_IDS: Record<string, string> = {
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about":
    "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
  "illness spike retreat truth genius clock brain pass fit cave bargain toe":
    "bd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7",
};

// Account keypair at m/44'/148'/index', the way the background derives accounts
// (addAccount.ts / createAccount.ts). StellarHDWallet.fromMnemonic cannot run
// under jest: its internal bip39 default import hits the CJS interop edge case
// described in deriveAuthKeypair.ts. fromSeed takes the raw 64-byte seed, so
// we build that with bip39's named export, exactly as deriveAuthSeed does.
const deriveAccount = (mnemonic: string, index: number): Keypair =>
  StellarHDWallet.fromSeed(
    Buffer.from(mnemonicToSeedSync(mnemonic)),
  ).getKeypair(index);

const accountRows = ACCOUNT_SOURCE_VECTORS.flatMap(({ mnemonic, accounts }) =>
  accounts.map((account) => ({ mnemonic, ...account })),
);

describe("identity continuity guard (frozen derivation)", () => {
  it("keeps the v1 salt", () => {
    expect(AUTH_SALT).toBe("freighter-auth-v1");
  });

  it.each(Object.entries(FROZEN_PHRASE_USER_IDS))(
    "derives the shipped userId for %s",
    async (mnemonic, userId) => {
      expect((await deriveAuthKeypair(mnemonic)).userId).toBe(userId);
    },
  );

  // The vectors are the cross-platform contract with freighter-mobile. They
  // must keep agreeing with the frozen values above.
  it("the committed vectors still hold the frozen userIds", () => {
    expect(
      Object.fromEntries(
        AUTH_KEYPAIR_VECTORS.map(({ mnemonic, userId }) => [mnemonic, userId]),
      ),
    ).toEqual(FROZEN_PHRASE_USER_IDS);
  });
});

/*
  EQUALITY GUARD. An account derived from a phrase at m/44'/148'/i' and the
  same account imported from its exported S… must be one source. That is
  what lets a wallet importing one exported account resolve to the phrase's
  user. If the two ever diverge, the import silently lands in a new user and
  nothing errors.
*/
describe("identity equality guard (phrase path == exported secret)", () => {
  it.each(accountRows)(
    "$mnemonic index $index resolves to one sourceId from both inputs",
    async ({ mnemonic, index, secret, publicKey, sourceId }) => {
      const fromPhrase = deriveAccount(mnemonic, index);
      const fromSecret = Keypair.fromSecret(secret);

      expect(fromPhrase.secret()).toBe(secret);
      expect(fromPhrase.publicKey()).toBe(publicKey);
      expect(fromSecret.publicKey()).toBe(publicKey);

      const viaPhrase = await deriveSourceIdentity(fromPhrase.rawSecretKey());
      const viaSecret = await deriveSourceIdentity(fromSecret.rawSecretKey());
      expect(viaPhrase.sourceId).toBe(sourceId);
      expect(viaSecret.sourceId).toBe(sourceId);
    },
  );
});
