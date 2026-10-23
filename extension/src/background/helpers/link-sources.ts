import { captureException } from "@sentry/browser";
import { Store } from "redux";

import { authedFetch } from "@shared/api/helpers/authedFetch";
import { UserLinkBody } from "@shared/api/helpers/userLinkConsent";
import { INDEXER_V2_URL } from "@shared/constants/mercury";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getLinkStatus,
  recordLinkResults,
} from "background/helpers/link-status";
import { SigningIdentity } from "background/helpers/signing-identity";
import { buildUserLinkRequestBodies } from "background/helpers/user-link";

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
  /** Injectable clock in ms epoch; defaults to Date.now() on each pass. */
  now?: number;
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

/** One POST. True when the server answered 2xx and the result was stored. */
const sendBody = async ({
  body,
  identity,
  now,
  localStore,
  fetchImpl,
}: {
  body: UserLinkBody;
  identity: SigningIdentity;
  now: number;
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
  await recordLinkResults({
    localStore,
    linked: sent.filter((id) => members.has(id) && !conflicts.has(id)),
    conflicts: sent.filter((id) => conflicts.has(id)),
  });
  return true;
};

const linkOnce = async ({
  sessionStore,
  localStore,
  fetchImpl,
  now = Date.now(),
}: LinkWalletSourcesParams) => {
  try {
    const settled = new Set(Object.keys(await getLinkStatus({ localStore })));
    const request = await buildUserLinkRequestBodies({
      sessionStore,
      localStore,
      linkedIds: settled,
      now,
    });
    if (!request) {
      return;
    }
    for (const body of request.bodies) {
      // Stop at the first failure: the rest would most likely fail the same
      // way, and the next trigger sends them anyway.
      const ok = await sendBody({
        body,
        identity: request.identity,
        now,
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
