import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  pinFirstSource,
  setPinnedSourceId,
} from "background/helpers/secret-sources";
import { getWalletSources } from "background/helpers/wallet-sources";

/*
  The one place that decides which identity the wallet speaks as. Backend
  auth (callBackendV2) and the analytics id both resolve through here; add a
  new identity consumer by calling this, not by re-deriving from a phrase.

  The JWT signer decides the user (unified-user-model/v2.md "Request
  signing"), so the wallet always signs with its pinned source: the first
  source it registered (see addSecretSource). It never follows the active
  account, so switching accounts, including to a hardware account, changes
  neither `sub` nor the resolved user.
*/

export interface SigningIdentity {
  /** The JWT `sub`: lowercase hex Ed25519 public key. */
  sourceId: string;
  keypair: Keypair;
}

/**
 * The pinned source and its signer, or null when the session holds no
 * signer: locked, hardware-only unlocked (no password hash) or nothing held.
 * A null means "send anonymously"; a user-scoped feature must prompt for the
 * password before its first request in that state.
 *
 * - The pinned source is held: sign with it.
 * - A pin is set but not held, as after a restore that recovered only some
 *   sources: sign with the first held source (phrases first) and leave the
 *   pin alone. The pin moves only from what the server returns (#69), so a
 *   source that failed to derive this unlock cannot move it either.
 * - No pin, as after a failed pin write: pin the earliest registered source
 *   (see pinFirstSource), or the first held source when nothing is
 *   registered.
 */
export const getSigningIdentity = async ({
  sessionStore,
  localStore,
}: {
  sessionStore: Store;
  localStore: DataStorageAccess;
}): Promise<SigningIdentity | null> => {
  try {
    const { sources, signers } = await getWalletSources({
      sessionStore,
      localStore,
    });
    if (!sources.length) {
      return null;
    }

    const [{ id: firstHeldId }] = sources;

    let pinned = await pinFirstSource({ localStore });
    if (!pinned) {
      await setPinnedSourceId({ localStore, sourceId: firstHeldId });
      pinned = firstHeldId;
    }

    const pinnedSigner = signers.get(pinned);
    if (pinnedSigner) {
      return { sourceId: pinned, keypair: pinnedSigner };
    }

    captureException("getSigningIdentity: the pinned source is not held");
    return { sourceId: firstHeldId, keypair: signers.get(firstHeldId)! };
  } catch (e) {
    // A locked or empty wallet is handled above, so anything reaching here
    // is unexpected (a WebCrypto/PBKDF2 failure, a storage read error).
    // Capture it: otherwise an unlocked user silently goes anonymous with no
    // signal. Capture the error itself, not a JSON.stringify of it, which
    // would yield "{}" and lose the stack.
    captureException(e, {
      extra: { context: "getSigningIdentity: unexpected error" },
    });
    return null;
  }
};
