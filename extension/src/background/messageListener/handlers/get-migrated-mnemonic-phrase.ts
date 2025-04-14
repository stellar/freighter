import { Store } from "redux";
// @ts-ignore
import { generateMnemonic } from "stellar-hd-wallet";
import { setMigratedMnemonicPhrase } from "background/ducks/session";

export const getMigratedMnemonicPhrase = ({
  sessionStore,
}: {
  sessionStore: Store;
}) => {
  const migratedMnemonicPhrase = generateMnemonic({ entropyBits: 128 });

  sessionStore.dispatch(setMigratedMnemonicPhrase({ migratedMnemonicPhrase }));

  return { mnemonicPhrase: migratedMnemonicPhrase };
};
