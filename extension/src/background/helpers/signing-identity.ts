import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { SecretSourceType } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getFirstSourceId,
  getPinnedSourceId,
} from "background/helpers/secret-sources";
import { getLinkStatus } from "background/helpers/link-status";
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

  This never writes the pin. Only registration (addSecretSource) and unlock
  (loginToAllAccounts) do, from the persisted source set. A request can
  overlap a wallet wipe and still derive the old wallet's sources, so a pin
  written from what one request derived could stick to the wrong wallet.
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
 * - The pinned source is held: sign with it. With no pin, as after a failed
 *   pin write, the earliest registered source stands in for it (the source
 *   the next registration or unlock will pin).
 * - That source is not held, as when it failed to derive this unlock: sign
 *   with a held source the server listed in this wallet's cluster
 *   ("linked"), else one it has not answered for yet, phrases first in each
 *   case. Never sign with a source the server reported as another user's
 *   ("conflict"): that would speak as that user. With only those held,
 *   return null. The pin stays put, so a source that failed to derive this
 *   unlock cannot move it; moving it waits for account removal, the first
 *   way a pinned source can leave the wallet for good.
 * - Nothing pinned and nothing registered, as when a request overlaps a
 *   wallet wipe: sign with the first held phrase, or return null when no
 *   phrase is held. Nothing is persisted, so a wrong guess lasts one request.
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

    const pinned =
      (await getPinnedSourceId({ localStore })) ??
      (await getFirstSourceId({ localStore }));

    if (!pinned) {
      const phrase = sources.find(
        ({ kind }) => kind === SecretSourceType.PHRASE,
      );
      return phrase
        ? { sourceId: phrase.id, keypair: signers.get(phrase.id)! }
        : null;
    }

    const pinnedSigner = signers.get(pinned);
    if (pinnedSigner) {
      return { sourceId: pinned, keypair: pinnedSigner };
    }

    captureException("getSigningIdentity: the pinned source is not held");
    const status = await getLinkStatus({ localStore });
    const fallback =
      sources.find(({ id }) => status[id] === "linked") ??
      sources.find(({ id }) => status[id] === undefined);
    return fallback
      ? { sourceId: fallback.id, keypair: signers.get(fallback.id)! }
      : null;
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
