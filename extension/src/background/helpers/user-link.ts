import { Store } from "redux";
import { Keypair } from "stellar-sdk";

import { issuedAtSeconds } from "@shared/api/helpers/buildAuthJwt";
import {
  buildLinkConsentMessage,
  MAX_LINK_SOURCES,
  signLinkConsent,
  UserLinkBody,
} from "@shared/api/helpers/userLinkConsent";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getSigningIdentity,
  SigningIdentity,
} from "background/helpers/signing-identity";
import {
  getWalletSources,
  WalletSource,
} from "background/helpers/wallet-sources";

/*
  Builds the signed bodies for POST /api/v1/user/link (#67). The call's job is
  to register every held source under the user the pinned source resolves to
  (unified-user-model/v2.md "API Examples"). Sending, the linked flags and the
  retry are #68.

  Every body carries `sub`, the signing source: a call without it would create
  a user no source resolves to, and the server rejects it. Each source in the
  body signs its own consent, bound to `sub` and the JWT's iat.
*/

/**
 * One body per call, each at most MAX_LINK_SOURCES entries and each starting
 * with `sub`. Sources in `linkedIds` are left out; `sub` is sent anyway while
 * any other source is pending. Returns [] once every source is linked.
 *
 * Duplicate ids collapse to the first occurrence: the server rejects a
 * repeated id with 400. Nothing else is checked here. The server rejects the
 * whole request if any consent fails.
 */
export const buildUserLinkBodies = ({
  identity,
  sources,
  signers,
  linkedIds = new Set(),
  iat,
}: {
  identity: SigningIdentity;
  sources: WalletSource[];
  signers: Map<string, Keypair>;
  linkedIds?: ReadonlySet<string>;
  iat: number;
}): UserLinkBody[] => {
  const unique = new Map<string, WalletSource>();
  for (const source of sources) {
    if (!unique.has(source.id)) {
      unique.set(source.id, source);
    }
  }

  const sub = unique.get(identity.sourceId);
  if (!sub) {
    // getSigningIdentity picks from the same set, so this is a caller bug.
    // Fail here rather than send a body the server is certain to reject.
    throw new Error("buildUserLinkBodies: the signing source is not held");
  }

  const pending = [...unique.values()].filter(
    ({ id }) => id !== sub.id && !linkedIds.has(id),
  );
  if (!pending.length && linkedIds.has(sub.id)) {
    return [];
  }

  const consent = ({ id, kind }: WalletSource) => {
    const keypair = id === sub.id ? identity.keypair : signers.get(id);
    if (!keypair) {
      throw new Error("buildUserLinkBodies: no signer for a source");
    }
    const message = buildLinkConsentMessage({
      id,
      kind,
      signingSourceId: sub.id,
      iat,
    });
    return { id, kind, sig: signLinkConsent({ keypair, message }) };
  };

  // `sub` takes one slot in every body.
  const perBody = MAX_LINK_SOURCES - 1;
  const signedSub = consent(sub);
  const bodies: UserLinkBody[] = [];
  for (let i = 0; i === 0 || i < pending.length; i += perBody) {
    bodies.push({
      sources: [signedSub, ...pending.slice(i, i + perBody).map(consent)],
    });
  }
  return bodies;
};

/**
 * Resolves the pinned signer and the held sources, then builds the bodies
 * under one iat. Null when the session holds no signer (locked or
 * hardware-only), the same as getSigningIdentity.
 *
 * Send each body with a JWT signed by `identity.keypair` and built from the
 * same `now` (buildAuthJwt({ now })), or every consent fails with 403. A retry
 * that mints a new JWT, such as authedFetch's 401 retry, must rebuild the
 * bodies with the new clock reading.
 */
export const buildUserLinkRequestBodies = async ({
  sessionStore,
  localStore,
  linkedIds,
  now = Date.now(),
}: {
  sessionStore: Store;
  localStore: DataStorageAccess;
  linkedIds?: ReadonlySet<string>;
  now?: number;
}): Promise<{
  identity: SigningIdentity;
  iat: number;
  bodies: UserLinkBody[];
} | null> => {
  const identity = await getSigningIdentity({ sessionStore, localStore });
  if (!identity) {
    return null;
  }
  // Cached per unlock, so this is the set getSigningIdentity just read.
  const { sources, signers } = await getWalletSources({
    sessionStore,
    localStore,
  });
  const iat = issuedAtSeconds(now);
  return {
    identity,
    iat,
    bodies: buildUserLinkBodies({
      identity,
      sources,
      signers,
      linkedIds,
      iat,
    }),
  };
};
