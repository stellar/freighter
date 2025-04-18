import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import {
  APPLICATION_ID,
  TEMPORARY_STORE_EXTRA_ID,
} from "constants/localStorageTypes";
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
  const mnemonicPhrase = await getEncryptedTemporaryData({
    sessionStore,
    localStore,
    keyName: TEMPORARY_STORE_EXTRA_ID,
  });
  const isCorrectPhrase = mnemonicPhrase === request.mnemonicPhraseToConfirm;

  const applicationState = isCorrectPhrase
    ? APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED
    : APPLICATION_STATE.MNEMONIC_PHRASE_FAILED;

  await localStore.setItem(APPLICATION_ID, applicationState);

  return {
    isCorrectPhrase,
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
  };
};
