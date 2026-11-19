import { Store } from "redux";

import { ClearPendingRecoveryPhraseMessage } from "@shared/api/types/message-request";
import {
  pendingMnemonicPhraseIdSelector,
  setPendingMnemonicPhrase,
} from "background/ducks/session";

/*
  Drops the phrase `generateRecoveryPhrase` is holding once the window that
  showed it is done with it. Gated on the generation id: another window may
  have generated since, and its phrase must survive this window closing.
*/
export const clearPendingRecoveryPhrase = ({
  request,
  sessionStore,
}: {
  request: ClearPendingRecoveryPhraseMessage;
  sessionStore: Store;
}) => {
  const { pendingPhraseId } = request;

  if (
    pendingPhraseId &&
    pendingPhraseId === pendingMnemonicPhraseIdSelector(sessionStore.getState())
  ) {
    sessionStore.dispatch(
      setPendingMnemonicPhrase({
        pendingMnemonicPhrase: "",
        pendingMnemonicPhraseId: "",
      }),
    );
  }

  return {};
};
