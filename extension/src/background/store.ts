import { combineReducers } from "redux";
import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";

import { sessionSlice } from "background/ducks/session";

// ALEC TODO - remove
const loggerMiddleware = (storeVal: any) => (next: any) => (action: any) => {
  console.log("[BG] Dispatching: ", action.type);
  const dispatchedAction = next(action);
  console.log("[BG] NEW STATE: ", storeVal.getState());
  return dispatchedAction;
};

export const store = configureStore({
  reducer: combineReducers({
    session: sessionSlice.reducer,
  }),
  middleware: [...getDefaultMiddleware()].concat(loggerMiddleware),
});
