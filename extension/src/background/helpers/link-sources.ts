import { captureException } from "@sentry/browser";
import { Store } from "redux";

import { authedFetch } from "@shared/api/helpers/authedFetch";
import { issuedAtSeconds } from "@shared/api/helpers/buildAuthJwt";
import { UserLinkBody } from "@shared/api/helpers/userLinkConsent";
import { INDEXER_V2_URL } from "@shared/constants/mercury";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getLinkStatus,
  getLinkStatusEpoch,
  recordLinkResults,
} from "background/helpers/link-status";
import { SigningIdentity } from "background/helpers/signing-identity";
import {
  buildUserLinkRequest,
  signUserLinkBody,
} from "background/helpers/user-link";

/*
  Sends POST /api/v1/user/link for every held source the server has not
  confirmed yet (#68). Onboarding, every source add and every unlock call
  this. A source with a stored status is left out, so once every source is
  settled a trigger sends nothing.

  Nothing here throws or reaches a handler's response. A failed call stores
  nothing, and the next trigger (at the latest, the next unlock) sends the
  same sources again. That is the retry for an install that was offline
  through onboarding.
*/

export interface LinkWalletSourcesParams {
  sessionStore: Store;
  localStore: DataStorageAccess;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable clock in ms epoch; read once per call. Defaults to Date.now. */
  clock?: () => number;
}

const LINK_PATH = "/user/link";

const idsOf = (list: unknown, key?: "id"): Set<string> => {
  const ids = new Set<string>();
  if (!Array.isArray(list)) {
    return ids;
  }
  for (const entry of list) {
    const id = key ? (entry as { id?: unknown })?.id : entry;
    if (typeof id === "string") {
      ids.add(id);
    }
  }
  return ids;
};

/**
 * One POST. True when the server answered 2xx and the result was stored;
 * false on an error status or when the wallet was replaced mid-request.
 */
const sendBody = async ({
  body,
  identity,
  now,
  epoch,
  localStore,
  fetchImpl,
}: {
  body: UserLinkBody;
  identity: SigningIdentity;
  now: number;
  epoch: number;
  localStore: DataStorageAccess;
  fetchImpl?: typeof fetch;
}): Promise<boolean> => {
  const url = new URL(`${INDEXER_V2_URL}${LINK_PATH}`);
  // The consents are bound to this JWT's iat, so a 401 retry under a new iat
  // would fail too. The next trigger rebuilds the bodies instead.
  const res = await authedFetch({
    keypair: identity.keypair,
    baseUrl: url.origin,
    method: "POST",
    path: `${url.pathname}${url.search}`,
    body: JSON.stringify(body),
    fetchImpl,
    now,
    retryOnUnauthorized: false,
  });
  if (!res.ok) {
    captureException(`linkWalletSources: /user/link returned ${res.status}`);
    return false;
  }

  const parsed = (await res.json().catch(() => null)) as {
    sources?: unknown;
    conflicts?: unknown;
  } | null;
  const members = idsOf(parsed?.sources, "id");
  const conflicts = idsOf(parsed?.conflicts);
  const sent = body.sources.map(({ id }) => id);

  // Only ids this body carried. A sent id the server reports neither way
  // stays unsettled and goes out again on the next trigger.
  return recordLinkResults({
    localStore,
    linked: sent.filter((id) => members.has(id) && !conflicts.has(id)),
    conflicts: sent.filter((id) => conflicts.has(id)),
    epoch,
  });
};

const linkOnce = async ({
  sessionStore,
  localStore,
  fetchImpl,
  clock = Date.now,
}: LinkWalletSourcesParams) => {
  try {
    // Read before anything else: a wallet replacement from here on discards
    // this pass's results, and the pass it queues starts over.
    const epoch = getLinkStatusEpoch();
    const settled = new Set(Object.keys(await getLinkStatus({ localStore })));
    const request = await buildUserLinkRequest({
      sessionStore,
      localStore,
      linkedIds: settled,
    });
    if (!request) {
      return;
    }
    for (const batch of request.batches) {
      if (getLinkStatusEpoch() !== epoch) {
        // The wallet these bodies came from has been replaced.
        return;
      }
      // Sign each body just before its call: a JWT lives 15 seconds, and a
      // slow earlier call would expire an iat taken at the start of the pass.
      const now = clock();
      const body = signUserLinkBody({
        identity: request.identity,
        signers: request.signers,
        batch,
        iat: issuedAtSeconds(now),
      });
      // Stop at the first failure: the rest would most likely fail the same
      // way, and the next trigger sends them anyway.
      const ok = await sendBody({
        body,
        identity: request.identity,
        now,
        epoch,
        localStore,
        fetchImpl,
      });
      if (!ok) {
        return;
      }
    }
  } catch (e) {
    // A fetch rejection (offline) lands here too.
    captureException(e, { extra: { context: "linkWalletSources" } });
  }
};

let inFlight: Promise<void> | null = null;
let rerunWith: LinkWalletSourcesParams | null = null;

/**
 * Links every unsettled source. Calls that overlap a run in flight don't
 * start a second request. They queue one more pass for after it, so a source
 * added mid-run still goes out. The returned promise settles after every
 * queued pass and never rejects.
 */
export const linkWalletSources = (
  params: LinkWalletSourcesParams,
): Promise<void> => {
  if (inFlight) {
    rerunWith = params;
    return inFlight;
  }
  inFlight = (async () => {
    try {
      let next: LinkWalletSourcesParams | null = params;
      while (next) {
        rerunWith = null;
        await linkOnce(next);
        next = rerunWith;
      }
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};
