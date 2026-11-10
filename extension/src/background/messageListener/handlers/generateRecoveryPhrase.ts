import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { setPendingMnemonicPhrase } from "background/ducks/session";

/*
  Generates the phrase for a new source in an existing wallet. The phrase is
  held in the session, not stored: it becomes a source only when
  `addRecoveryPhraseSource` runs, after the user has seen and saved it. A
  second call replaces the held phrase, so backing out and starting over
  never stores the abandoned one.
*/
export const generateRecoveryPhrase = ({
  sessionStore,
}: {
  sessionStore: Store;
}) => {
  const mnemonicPhrase = StellarHDWallet.generateMnemonic({
    entropyBits: 128,
  });

  sessionStore.dispatch(
    setPendingMnemonicPhrase({ pendingMnemonicPhrase: mnemonicPhrase }),
  );

  return { mnemonicPhrase };
};
