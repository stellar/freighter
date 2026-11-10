import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { setPendingMnemonicPhrase } from "background/ducks/session";

/*
  Generates the phrase for a new source in an existing wallet. The phrase is
  held in the session, not stored: it becomes a source only when
  `addRecoveryPhraseSource` runs, after the user has seen and saved it. A
  second call replaces the held phrase, so backing out and starting over
  never stores the abandoned one.

  Every window shares the session, so each generation gets an id the popup
  sends back on confirm. A window whose phrase was replaced by another
  window's generation can't store the phrase it never showed.
*/
export const generateRecoveryPhrase = ({
  sessionStore,
}: {
  sessionStore: Store;
}) => {
  const mnemonicPhrase = StellarHDWallet.generateMnemonic({
    entropyBits: 128,
  });

  const pendingPhraseId = crypto.randomUUID();

  sessionStore.dispatch(
    setPendingMnemonicPhrase({
      pendingMnemonicPhrase: mnemonicPhrase,
      pendingMnemonicPhraseId: pendingPhraseId,
    }),
  );

  return { mnemonicPhrase, pendingPhraseId };
};
