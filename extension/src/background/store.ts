import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";

import { sessionSlice } from "background/ducks/session";
import {
  SESSION_STORAGE_ENABLED,
  dataStorageAccess,
  sessionStorage,
  browserStorage,
} from "./helpers/dataStorage";

// Session storage can be used to persist redux store in Manifest v3 because service workers go idle after 30 seconds
// Session storage is not currently supported in Firefox, which blocks our migration to using this by default
const REDUX_STORE_KEY = "redux-store";
const dataStore = dataStorageAccess(
  SESSION_STORAGE_ENABLED ? sessionStorage : browserStorage,
);

async function loadState() {
  try {
    const state = await dataStore.getItem(REDUX_STORE_KEY);
    console.log(`STATE: ${JSON.parse(state)}`);
    if (!state) return undefined;
    return JSON.parse(state);
  } catch (_error) {
    return undefined;
  }
}

function saveStore(state: Record<string, unknown>) {
  console.log(`NEW STATE ${state}`);
  const serializedState = JSON.stringify(state);
  dataStore.setItem(REDUX_STORE_KEY, serializedState);
}

export const buildStore = async () => {
  const reduxState = await loadState();
  const store = configureStore({
    reducer: combineReducers({
      session: sessionSlice.reducer,
    }),
    preloadedState: reduxState,
  });

  if (SESSION_STORAGE_ENABLED) {
    console.log("store subscribed");
    store.subscribe(() => saveStore(store.getState()));
  }

  return store;
};
