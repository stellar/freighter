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
    try {
      const settings = await internalLoadSettings();
      dispatch(saveSettingsAction(settings));
    } catch (e) {
      // Refresh is best-effort: a failed reload should not prevent the
      // grant from resolving, since the backend write already succeeded.
      // Next loadSettings call (e.g. on the next view mount) will sync.
      captureException(e, {
        extra: { context: "grantAccess: failed to refresh settings" },
      });
    }
    return result;
  },
);

export const rejectAccess = createAsyncThunk(
  "rejectAccess",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);

export const signTransaction = createAsyncThunk(
  "signTransaction",
  ({ uuid }: { uuid: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignTransaction({ activePublicKey, uuid });
  },
);

export const signBlob = createAsyncThunk(
  "signBlob",
  (
    { apiVersion, uuid }: { apiVersion?: string; uuid: string },
    { getState },
  ) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignBlob({ apiVersion, activePublicKey, uuid });
  },
);
export const signEntry = createAsyncThunk(
  "signEntry",
  ({ uuid }: { uuid: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignAuthEntry({ activePublicKey, uuid });
  },
);

export const addToken = createAsyncThunk(
  "addToken",
  ({ uuid }: { uuid: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalAddToken({ activePublicKey, uuid });
  },
);

export const rejectToken = createAsyncThunk(
  "rejectToken",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);

export const rejectTransaction = createAsyncThunk(
  "rejectTransaction",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);

export const rejectBlob = createAsyncThunk(
  "rejectBlob",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);
export const rejectAuthEntry = createAsyncThunk(
  "rejectAuthEntry",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);
