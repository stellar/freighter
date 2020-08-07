import { createAction } from "@reduxjs/toolkit";
import { Location } from "history";

export const navigate = createAction("navigate", (location: Location) => ({
  payload: {
    location,
  },
}));
