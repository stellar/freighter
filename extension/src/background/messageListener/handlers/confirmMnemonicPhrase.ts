import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
import { APPLICATION_ID } from "constants/localStorageTypes";
import { ConfirmMnemonicPhraseMessage } from "@shared/api/types/message-request";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

export const confirmMnemonicPhrase = async ({
  request,
  sessionStore,
  localStore,
}: {
  request: ConfirmMnemonicPhraseMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  // Onboarding confirms the phrase just created, which is the only one held.
  const held = await getDefaultMnemonic({ sessionStore, localStore });
  const isCorrectPhrase =
    !!held && held.mnemonic === request.mnemonicPhraseToConfirm;

  const applicationState = isCorrectPhrase
    ? APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED
    : APPLICATION_STATE.MNEMONIC_PHRASE_FAILED;

  await localStore.setItem(APPLICATION_ID, applicationState);

  return {
    isCorrectPhrase,
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
  };
};
