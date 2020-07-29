import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";

import { sessionSlice } from "background/ducks/session";

export const store = configureStore({
  reducer: combineReducers({
    session: sessionSlice.reducer,
  }),
});
