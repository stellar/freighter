import { Store } from "redux";
import StellarHdWallet from "stellar-hd-wallet";
import { setMigratedMnemonicPhrase } from "background/ducks/session";

export const getMigratedMnemonicPhrase = ({
  sessionStore,
}: {
  sessionStore: Store;
}) => {
  const migratedMnemonicPhrase = StellarHdWallet.generateMnemonic({
    entropyBits: 128,
  });

  sessionStore.dispatch(setMigratedMnemonicPhrase({ migratedMnemonicPhrase }));

  return { mnemonicPhrase: migratedMnemonicPhrase };
};
