import { Store } from "redux";

import { GetIsAccountMismatchMessage } from "@shared/api/types/message-request";
import { publicKeySelector } from "background/ducks/session";

export const getIsAccountMismatch = ({
  request,
  sessionStore,
}: {
  request: GetIsAccountMismatchMessage;
  sessionStore: Store;
}) => {
  const { activePublicKey } = request;

  if (!activePublicKey) {
    return { isAccountMismatch: false };
  }

  const currentState = sessionStore.getState();
  const publicKey = publicKeySelector(currentState);

  return { isAccountMismatch: publicKey !== activePublicKey };
};
