import { Buffer } from "buffer";
import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import {
  deriveAuthKeypair,
  deriveSourceIdentity,
} from "@shared/api/helpers/deriveAuthKeypair";
import { SecretSourceType } from "@shared/api/types";
import { hashKeySelector, SessionState } from "background/ducks/session";
import { getKeyIdList, HW_PREFIX } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getActiveHashKeyCryptoKey,
  dropCachedWalletSources,
  getCachedWalletSources,
  getEncryptedTemporaryData,
  getMnemonics,
  getWalletSourcesGeneration,
  setCachedWalletSources,
} from "background/helpers/session";

/*
  Every source identity an unlocked wallet holds, with the keypair that signs
  for it: one `phrase` source per held phrase and one `secret_key` source per
  keystore that holds a private key. See unified-user-model/v2.md
  "Enumerating a wallet's identities".

  An account's source id comes from its secret key alone. deriveSourceIdentity
  returns the same id whether the account was derived or imported, so this
  never reads `extra.mnemonicPhrase` or account provenance. A key imported on
  its own that a held phrase also derives is therefore one source.

  The pinned source signs the JWT; each source in a /user/link body
  signs its own consent.
*/

export interface WalletSource {
  id: string;
  kind: SecretSourceType;
}

export interface WalletSources {
  sources: WalletSource[];
  signers: Map<string, Keypair>;
}

const empty = (): WalletSources => ({ sources: [], signers: new Map() });

/*
  Derives every source. `complete` is false when any source threw: the set is
  still returned, without that source, but it is not cached, so the next call
  retries instead of hiding the source until the next unlock.
*/
const deriveWalletSources = async ({
  sessionStore,
  localStore,
  keyIdList,
  phraseSigners,
}: {
  sessionStore: Store;
  localStore: DataStorageAccess;
  keyIdList: string[];
  phraseSigners?: Map<string, Keypair>;
}): Promise<{ sources: WalletSources; complete: boolean }> => {
  const result = empty();
  let complete = true;

  const add = (id: string, kind: SecretSourceType, keypair: Keypair) => {
    if (result.signers.has(id)) {
      return;
    }
    result.sources.push({ id, kind });
    result.signers.set(id, keypair);
  };

  // One PBKDF2 per phrase (mnemonicToSeedSync); the reason this is cached,
  // and why a keypair the caller already derived is used as is.
  const mnemonics = await getMnemonics({ sessionStore, localStore });
  for (const [heldId, mnemonic] of Object.entries(mnemonics)) {
    const seeded = phraseSigners?.get(heldId);
    if (seeded) {
      add(heldId, SecretSourceType.PHRASE, seeded);
      continue;
    }
    try {
      const { userId, keypair } = await deriveAuthKeypair(mnemonic);
      if (userId !== heldId) {
        captureException(
          "Held phrase is stored under a source id it does not derive",
        );
      }
      add(userId, SecretSourceType.PHRASE, keypair);
    } catch (e) {
      // One unreadable phrase must not hide the wallet's other sources.
      complete = false;
      captureException(e, {
        extra: { context: "getWalletSources: deriving a phrase source" },
      });
    }
  }

  for (const keyId of keyIdList) {
    // Hardware keystores hold no private key and so produce no source.
    if (keyId.includes(HW_PREFIX)) {
      continue;
    }

    try {
      const secretKey = await getEncryptedTemporaryData({
        sessionStore,
        localStore,
        keyName: keyId,
      });
      // No private key in hand: unlock failed to store it, or a migration
      // re-keyed the session. Only the next unlock writes it, under a new hash
      // key and so a new cache key, so retrying here would only repeat the
      // phrase derivations.
      if (!secretKey) {
        captureException("getWalletSources: no private key for a keystore");
        continue;
      }
      const { sourceId, keypair } = await deriveSourceIdentity(
        Keypair.fromSecret(secretKey).rawSecretKey(),
      );
      add(sourceId, SecretSourceType.SECRET_KEY, keypair);
    } catch (e) {
      complete = false;
      captureException(e, {
        extra: { context: "getWalletSources: deriving an account source" },
      });
    }
  }

  return { sources: result, complete };
};

/* SHA-256 hex, so the cache key never holds a copy of the hash key. */
const digest = async (str: string) =>
  Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)),
  ).toString("hex");

/**
 * The wallet's sources and their signers. Empty while locked.
 *
 * Cached in memory against the session's hash key (every unlock replaces it,
 * every lock clears the cache) and the keystore id list. Every held phrase
 * comes in with a keystore, so adding, importing, replacing or removing an
 * account or a phrase changes the list and re-derives.
 *
 * `phraseSigners` holds phrase keypairs the caller already derived, by source
 * id. Unlock passes the ones it derived to key the held phrase map, so each
 * phrase is derived once per unlock.
 */
export const getWalletSources = async ({
  sessionStore,
  localStore,
  phraseSigners,
}: {
  sessionStore: Store;
  localStore: DataStorageAccess;
  phraseSigners?: Map<string, Keypair>;
}): Promise<WalletSources> => {
  // Read before the first await: a lock that lands anywhere after this point
  // must stop the result from being cached.
  const generation = getWalletSourcesGeneration();
  const hashKey = hashKeySelector(sessionStore.getState() as SessionState)?.key;

  if (
    !hashKey ||
    (await getActiveHashKeyCryptoKey({ sessionStore })) === null
  ) {
    return empty();
  }

  const keyIdList: string[] = await getKeyIdList({ localStore });
  const cacheKey = await digest(JSON.stringify([hashKey, keyIdList]));

  const cached = getCachedWalletSources(cacheKey);
  if (cached) {
    return cached;
  }

  const pending: Promise<WalletSources> = deriveWalletSources({
    sessionStore,
    localStore,
    keyIdList,
    phraseSigners,
  }).then(
    ({ sources, complete }) => {
      // A lock landed mid-derivation: hand back nothing from the ended session.
      if (generation !== getWalletSourcesGeneration()) {
        return empty();
      }
      if (!complete) {
        dropCachedWalletSources(pending);
      }
      return sources;
    },
    (e) => {
      dropCachedWalletSources(pending);
      throw e;
    },
  );
  setCachedWalletSources(cacheKey, pending, generation);

  return pending;
};
