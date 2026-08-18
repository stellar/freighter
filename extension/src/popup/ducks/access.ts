import { createAsyncThunk } from "@reduxjs/toolkit";
import { captureException } from "@sentry/browser";

import {
  rejectAccess as internalRejectAccess,
  grantAccess as internalGrantAccess,
  loadSettings as internalLoadSettings,
  addToken as internalAddToken,
  signTransaction as internalSignTransaction,
  signBlob as internalSignBlob,
  signAuthEntry as internalSignAuthEntry,
} from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { saveSettingsAction } from "popup/ducks/settings";
import { AppState } from "popup/App";

// After granting access to a dApp, refresh popup-side settings so the
// updated allowList is reflected in redux. Without this, sidebar mode
// reuses the same popup React tree across consecutive signing flows
// (e.g. `signMessage` → `requestAccess` → `signMessage` continuation),
// and `useIsDomainListedAllowed` still reads the pre-grant allowList,
// showing the just-connected dApp as "not connected". Popup windows
// opened via `browser.windows.create` mount fresh redux and refetch on
// their own — the bug is sidebar-specific — but refreshing here makes
// the behaviour consistent across both surfaces.
export const grantAccess = createAsyncThunk(
  "grantAccess",
  async ({ url, uuid }: { url: string; uuid: string }, { dispatch }) => {
    const result = await internalGrantAccess({ url, uuid });
    // Fire-and-forget: do NOT await the refresh before resolving. Awaiting it
    // delayed GrantAccess's window.close()/route-close, which in sidebar mode
    // kept the reused popup tree on /grant-access long enough for the dApp's
    // follow-up signing request to be treated as interrupting an active
    // signing route (showing an interstitial) and then clobbered by the
    // deferred close. Letting the refresh run async still updates redux when
    // it resolves, re-rendering the next view with the fresh allowList.
    internalLoadSettings()
      .then((settings) => dispatch(saveSettingsAction(settings)))
      .catch((e) => {
        // Best-effort: a failed reload must not break the grant, since the
        // backend write already succeeded. The next loadSettings call (e.g.
        // on the next view mount) will sync.
        captureException(e, {
          extra: { context: "grantAccess: failed to refresh settings" },
        });
      });
    return result;
  },
);

export const rejectAccess = createAsyncThunk(
  "rejectAccess",
  ({ uuid }: { uuid: string; url?: string }) => internalRejectAccess({ uuid }),
);

// NB: several signing thunks accept an optional `url` that the payload creators
// ignore — it rides in `action.meta.arg` so the metrics handlers in
// popup/metrics/access.ts can attach `origin` to the signing events.
export const signTransaction = createAsyncThunk(
  "signTransaction",
  ({ uuid }: { uuid: string; url?: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignTransaction({ activePublicKey, uuid });
  },
);

export const signBlob = createAsyncThunk(
  "signBlob",
  (
    { apiVersion, uuid }: { apiVersion?: string; uuid: string; url?: string },
    { getState },
  ) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignBlob({ apiVersion, activePublicKey, uuid });
  },
);
export const signEntry = createAsyncThunk(
  "signEntry",
  ({ uuid }: { uuid: string; url?: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignAuthEntry({ activePublicKey, uuid });
  },
);

export const addToken = createAsyncThunk(
  "addToken",
  (
    {
      uuid,
      isTrustlineBacked,
    }: {
      uuid: string;
      isTrustlineBacked?: boolean;
      // Carried for analytics only (asset_add.responded { asset_code }); not
      // used by the thunk body — read off action.meta.arg in metrics/access.ts.
      assetCode?: string;
    },
    { getState },
  ) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalAddToken({ activePublicKey, uuid, isTrustlineBacked });
  },
);

export const rejectToken = createAsyncThunk(
  "rejectToken",
  // assetCode is carried for analytics only (see addToken above).
  ({ uuid }: { uuid: string; assetCode?: string }) =>
    internalRejectAccess({ uuid }),
);

export const rejectTransaction = createAsyncThunk(
  "rejectTransaction",
  ({ uuid }: { uuid: string; url?: string }) => internalRejectAccess({ uuid }),
);

export const rejectBlob = createAsyncThunk(
  "rejectBlob",
  ({ uuid }: { uuid: string; url?: string }) => internalRejectAccess({ uuid }),
);
export const rejectAuthEntry = createAsyncThunk(
  "rejectAuthEntry",
  ({ uuid }: { uuid: string; url?: string }) => internalRejectAccess({ uuid }),
);
