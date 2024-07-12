import { CombinedState, combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";

import { sessionSlice } from "background/ducks/session";
import {
  dataStorageAccess,
  browserSessionStorage,
} from "./helpers/dataStorageAccess";
import { SESSION_STORAGE_ENABLED } from "./helpers/dataStorage";

// Session storage can be used to persist redux store in Manifest v3 because service workers go idle after 30 seconds
// Session storage is not currently supported in Firefox, which blocks our migration to using this by default
const REDUX_STORE_KEY = "session-store";
const sessionStore = dataStorageAccess(browserSessionStorage);

export async function loadState() {
  try {
    const state = await sessionStore.getItem(REDUX_STORE_KEY);
    if (!state) {
      return undefined;
    }
    return JSON.parse(state as string);
  } catch (_error) {
    return undefined;
  }
}

function saveStore(state: CombinedState<any>) {
  const serializedState = JSON.stringify(state);
  sessionStore.setItem(REDUX_STORE_KEY, serializedState);
}

const store = configureStore({
  reducer: combineReducers({
    session: sessionSlice.reducer,
  }),
});

/*
  When session store is enabled, we need to return a hydrated store that syncs to
  to/from the session store because service workers are ephemeral.
  When session store is disabled, we need to return a store that lives on the top
  level scope of this script because it will run in a persistent background script.
*/
export const buildStore = async () => {
  if (SESSION_STORAGE_ENABLED) {
    const reduxState = await loadState();
    const hydratedStore = configureStore({
      reducer: combineReducers({
        session: sessionSlice.reducer,
      }),
      preloadedState: reduxState,
    });

    hydratedStore.subscribe(() => saveStore(hydratedStore.getState()));
    return hydratedStore;
  }

  return store;
};
