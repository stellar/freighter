import { Action, Middleware } from "redux";
import {
  getIsAccountMismatch,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { AppDispatch } from "popup/App";

export function actibePublicKeyMiddleware<State>(): Middleware<Action, State> {
  return ({ getState, dispatch }) =>
    (next) =>
    (action: any) => {
      const state = getState();
      const activePublicKey = publicKeySelector(state as any);

      // @ts-ignore
      const middlewareDispatch: AppDispatch = dispatch;

      if (
        action?.meta?.requestStatus === "pending" &&
        !action.type.includes("auth/getIsAccountMismatch")
      ) {
        middlewareDispatch(getIsAccountMismatch({ activePublicKey }));
      }

      return next(action);
    };
}
