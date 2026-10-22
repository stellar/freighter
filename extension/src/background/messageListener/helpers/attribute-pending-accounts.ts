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
  getPinnedSourceId,
  getSecretKeySourceId,
  setPinnedSourceId,
} from "background/helpers/secret-sources";
import {
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";
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
  - A keystore with `extra.imported` set becomes its own "Secret Key N". The
    phrase pre-#75 builds stamped into it is ignored.
  - Any other keystore is attributed to the phrase in its own `extra`, and its
    actual index is marked.

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
  identityPhrase,
}: {
  localStore: DataStorageAccess;
  keyManager: KeyManager;
  password: string;
  identityPhrase?: string;
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

  let pinCandidate: string | undefined;

  if (identityPhrase) {
    try {
      const identityId = await getPhraseSourceId(identityPhrase);
      // Registered first, so it takes "Seed Phrase 1".
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
      pinCandidate = identityId;
    } catch (e) {
      captureException(
        `Error registering the pre-V2 wallet phrase: ${JSON.stringify(e)}`,
      );
    }
  }

  let attributed = false;

  // `keyIdList` order, so "Secret Key N" follows the order accounts were added.
  for (const keyId of keyIdList.filter((id) => pending.includes(id))) {
    try {
      const key = await unlockKeystore({ keyID: keyId, password, keyManager });

      if (key.extra?.imported) {
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
        pinCandidate = pinCandidate ?? sourceId;
      } else {
        const phrase = key.extra?.mnemonicPhrase;
        if (!phrase) {
          throw new Error("derived keystore carries no phrase");
        }
        const sourceId = await getPhraseSourceId(phrase);
        await addSecretSource({
          localStore,
          id: sourceId,
          type: SecretSourceType.PHRASE,
        });
        const index = findDerivationIndex(
          walletFor(phrase),
          key.publicKey,
          searchLimit,
        );
        if (index !== null) {
          await markDerivationIndexUsed({ localStore, sourceId, index });
        }
        await setAccountProvenance({
          localStore,
          keyId,
          type: AccountType.FREIGHTER,
          sourceId,
        });
        pinCandidate = pinCandidate ?? sourceId;
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

  // The pin never moves once set.
  if (pinCandidate && !(await getPinnedSourceId({ localStore }))) {
    await setPinnedSourceId({ localStore, sourceId: pinCandidate });
  }

  return attributed;
};
