import { Action, Middleware } from "redux";
import {
  getIsAccountMismatch,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { AppDispatch } from "popup/App";

/* 
  This middleware is design to check if there is a mismatch between the popup's active account and the 
  background's active account. This can happen if a user opens the popup in fullscreen mode,
  and then changes the account in another screen. 

  This middleware will dispatch an action to check for mismatch on every single action that is dispatched.
*/
export function activePublicKeyMiddleware<State>(): Middleware<Action, State> {
  return ({ getState, dispatch }) =>
    (next) =>
    (action) => {
      const state = getState();
      const activePublicKey = publicKeySelector(state as any);
      const _action = action as {
        meta: { requestStatus: string };
        type: string;
      };
      const middlewareDispatch = dispatch as AppDispatch;

      if (
        _action?.meta?.requestStatus === "pending" &&
        !_action.type.includes("auth/getIsAccountMismatch")
      ) {
        middlewareDispatch(getIsAccountMismatch({ activePublicKey }));
      }

      return next(action);
    };
}
