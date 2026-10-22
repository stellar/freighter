import StellarHDWallet from "stellar-hd-wallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import { AccountType, SecretSourceType } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { setAccountProvenance } from "background/helpers/account-provenance";
import { markDerivationIndexUsed } from "background/helpers/derivation-indices";
import {
  getPendingAttribution,
  removePendingAttribution,
} from "background/helpers/pre-v2-migration";
import {
  addSecretSource,
  getPhraseSourceId,
  getSecretKeySourceId,
} from "background/helpers/secret-sources";
import { getIsHardwareWalletActive } from "background/helpers/account";
import {
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";
import { getNonHwKeyID } from "./get-non-hw-key-id";
import { unlockKeystore } from "./unlock-keystore";

const { fromMnemonic } = StellarHDWallet;

/**
 * How far past the larger of the old counter and the account count to look
 * for a derived keystore's index. Recovery preloaded funded accounts at
 * indices it never wrote back to `keyIdList` order, so the counter alone is
 * not an exact bound.
 */
const INDEX_SEARCH_MARGIN = 10;

/** The old global counter: the highest index the wallet phrase derived. */
const readLegacyCounter = async (localStore: DataStorageAccess) => {
  const counter = Number(await localStore.getItem(KEY_DERIVATION_NUMBER_ID));
  return Number.isInteger(counter) && counter > 0 ? counter : 0;
};

/** The index `publicKey` sits at under `mnemonic`, or null if not found. */
const findDerivationIndex = (
  wallet: StellarHDWallet,
  publicKey: string,
  limit: number,
): number | null => {
  for (let index = 0; index <= limit; index += 1) {
    if (wallet.getPublicKey(index) === publicKey) {
      return index;
    }
  }
  return null;
};

/*
  The unlock pass of the pre-V2 migration (#76); the install pass and the
  rollback posture are described in `background/helpers/pre-v2-migration.ts`.

  Resolves every account the install pass left in `pendingAttribution`. It
  needs the password because a pre-V2 keystore's phrase and its
  `extra.imported` flag are encrypted.

  - The identity phrase becomes "Seed Phrase 1", the pinned source. It is the
    phrase pre-V2 builds derived the analytics id from: the active keystore's,
    or the first non-hardware keystore's when a hardware account is active.
    Pinning it keeps the wallet's `metrics_user_id` and makes its first link
    sign as the phrase, so the cluster root equals the existing analytics id.
  - Its index set is seeded with 0..`keyDerivationNumber`. Over-marking is
    safe: a marked index is only ever skipped.
  - A keystore whose key derives from the phrase in its own `extra` is
    attributed to that phrase, and its actual index is marked. This holds even
    with `extra.imported` set: recovery before 5.45.0 preloaded funded phrase
    accounts with that flag.
  - Any other keystore with `extra.imported` set becomes its own "Secret Key
    N". The phrase pre-#75 builds stamped into it is not its source.

  Every write is idempotent and an id leaves the pending list only once its
  provenance is written, so an interrupted pass resumes on the next unlock. A
  hardware-only session never runs this; its accounts stay pending until the
  next password unlock.

  Returns true when it attributed anything, so the caller rebuilds the
  session's account list from the new provenance.
*/
export const attributePendingAccounts = async ({
  localStore,
  keyManager,
  password,
}: {
  localStore: DataStorageAccess;
  keyManager: KeyManager;
  password: string;
}): Promise<boolean> => {
  const pending = await getPendingAttribution({ localStore });

  if (!pending.length) {
    return false;
  }

  const keyIdList = ((await localStore.getItem(KEY_ID_LIST)) as string[]) || [];

  // Ids no longer in the wallet were removed since the install pass ran. Drop
  // them before anything is registered or seeded: after a recovery the list
  // holds only the old wallet's ids, and seeding the recovered phrase from the
  // old counter would skip indices it never used.
  for (const keyId of pending.filter((id) => !keyIdList.includes(id))) {
    await removePendingAttribution({ localStore, keyId });
  }

  if (!keyIdList.some((id) => pending.includes(id))) {
    return false;
  }

  const counter = await readLegacyCounter(localStore);
  const searchLimit = Math.max(counter, keyIdList.length) + INDEX_SEARCH_MARGIN;
  const wallets = new Map<string, StellarHDWallet>();
  const walletFor = (phrase: string) => {
    let wallet = wallets.get(phrase);
    if (!wallet) {
      wallet = fromMnemonic(phrase);
      wallets.set(phrase, wallet);
    }
    return wallet;
  };

  let identityId: string | undefined;

  // The pre-V2 identity rule, applied only here, once per pending wallet:
  // the active keystore's phrase, or the first non-hardware keystore's when a
  // hardware account is active.
  let identityKeyId = ((await localStore.getItem(KEY_ID)) as string) || "";
  if (await getIsHardwareWalletActive({ localStore })) {
    identityKeyId = await getNonHwKeyID({ localStore });
  }

  if (identityKeyId) {
    try {
      const { extra } = await unlockKeystore({
        keyID: identityKeyId,
        password,
        keyManager,
      });
      if (extra?.mnemonicPhrase) {
        identityId = await getPhraseSourceId(extra.mnemonicPhrase);
      }
    } catch (e) {
      captureException(
        `Error reading the pre-V2 wallet phrase: ${JSON.stringify(e)}`,
      );
    }
  }

  // addSecretSource pins the first source it registers, and the pin never
  // moves after that. These writes stay outside the catch: if one fails, no id
  // has left the pending list yet, so the whole pass retries rather than
  // letting a later account pin another source.
  if (identityId) {
    // Registered first, so it takes "Seed Phrase 1" and the pin.
    await addSecretSource({
      localStore,
      id: identityId,
      type: SecretSourceType.PHRASE,
    });
    for (let index = 0; index <= counter; index += 1) {
      await markDerivationIndexUsed({
        localStore,
        sourceId: identityId,
        index,
      });
    }
  }

  let attributed = false;

  // `keyIdList` order, so "Secret Key N" follows the order accounts were added.
  for (const keyId of keyIdList.filter((id) => pending.includes(id))) {
    try {
      const key = await unlockKeystore({ keyID: keyId, password, keyManager });
      const phrase = key.extra?.mnemonicPhrase;
      const index = phrase
        ? findDerivationIndex(walletFor(phrase), key.publicKey, searchLimit)
        : null;

      if (key.extra?.imported && index === null) {
        const sourceId = await getSecretKeySourceId(key.privateKey);
        await addSecretSource({
          localStore,
          id: sourceId,
          type: SecretSourceType.SECRET_KEY,
        });
        await setAccountProvenance({
          localStore,
          keyId,
          type: AccountType.IMPORTED,
          sourceId,
        });
      } else {
        if (!phrase) {
          throw new Error("derived keystore carries no phrase");
        }
        const sourceId = await getPhraseSourceId(phrase);
        await addSecretSource({
          localStore,
          id: sourceId,
          type: SecretSourceType.PHRASE,
        });
        if (index !== null) {
          await markDerivationIndexUsed({ localStore, sourceId, index });
        }
        await setAccountProvenance({
          localStore,
          keyId,
          type: AccountType.FREIGHTER,
          sourceId,
        });
      }

      await removePendingAttribution({ localStore, keyId });
      attributed = true;
    } catch (e) {
      // Leave it pending; the next unlock retries. One unreadable keystore
      // must not stop the others from being attributed.
      captureException(
        `Error attributing a pre-V2 account: ${JSON.stringify(e)}`,
      );
    }
  }

  return attributed;
};
