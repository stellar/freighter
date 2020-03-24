import { createAction, createReducer } from "@reduxjs/toolkit";

export const Actions = {
  INCREMENT: "INCREMENT",
  DECREMENT: "DECREMENT",
};

export const InitialState = 0;

export const reducer = createReducer(InitialState, {
  [Actions.INCREMENT]: (state) => state + 1,

  [Actions.DECREMENT]: (state) => state - 1,
});

export const ActionCreators = {
  increment: createAction(Actions.INCREMENT),
  decrement: createAction(Actions.DECREMENT),
};
