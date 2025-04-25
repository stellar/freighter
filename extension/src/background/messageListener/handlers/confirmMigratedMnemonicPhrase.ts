import { Store } from "redux";

import { ConfirmMigratedMnemonicPhraseMessage } from "@shared/api/types/message-request";
import { migratedMnemonicPhraseSelector } from "background/ducks/session";

export const confirmMigratedMnemonicPhrase = async ({
  request,
  sessionStore,
}: {
  request: ConfirmMigratedMnemonicPhraseMessage;
  sessionStore: Store;
}) => {
  const isCorrectPhrase =
    migratedMnemonicPhraseSelector(sessionStore.getState()) ===
    request.mnemonicPhraseToConfirm;

  return {
    isCorrectPhrase,
  };
};
