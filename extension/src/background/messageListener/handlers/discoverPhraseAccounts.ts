import StellarHDWallet from "stellar-hd-wallet";
import { captureException } from "@sentry/browser";

import { DiscoverPhraseAccountsMessage } from "@shared/api/types/message-request";
import {
  ACCOUNT_DISCOVERY_FAILED_ERROR,
  IMPORT_PHRASE_FAILED_ERROR,
  PHRASE_ALREADY_HELD_ERROR,
} from "@shared/constants/errors";
import {
  isValidImportMnemonic,
  normalizeMnemonic,
} from "@shared/api/helpers/mnemonic";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getPhraseSourceId,
  getSecretSources,
} from "background/helpers/secret-sources";
import { discoverFundedIndices } from "../helpers/discover-funded-indices";

const { fromMnemonic } = StellarHDWallet;

/*
  Finds which of a phrase's indices 1 to `discoveryDepth - 1` are funded on
  mainnet, ahead of IMPORT_RECOVERY_PHRASE. It only reads, so it runs off the
  account-mutation lock: a slow Horizon can't hold off sign-out or auto-lock.

  Any failed lookup fails the whole call. Once imported, the phrase is held
  and can't be rescanned, so a partial list would leave accounts out for good.
*/
export const discoverPhraseAccounts = async ({
  request,
  localStore,
  discoveryDepth,
}: {
  request: DiscoverPhraseAccountsMessage;
  localStore: DataStorageAccess;
  discoveryDepth: number;
}) => {
  const mnemonicPhrase = normalizeMnemonic(request.mnemonicPhrase || "");

  if (!isValidImportMnemonic(mnemonicPhrase)) {
    return { error: "Invalid mnemonic phrase" };
  }

  let sourceId: string;
  let wallet: ReturnType<typeof fromMnemonic>;
  try {
    sourceId = await getPhraseSourceId(mnemonicPhrase);
    wallet = fromMnemonic(mnemonicPhrase);
  } catch (e) {
    captureException(
      `Error deriving phrase for discovery: ${JSON.stringify(e)}`,
    );
    return { error: IMPORT_PHRASE_FAILED_ERROR };
  }

  // Skips the lookups for a phrase the wallet already holds.
  if ((await getSecretSources({ localStore }))[sourceId]) {
    return { error: PHRASE_ALREADY_HELD_ERROR };
  }

  const { funded, failedCount } = await discoverFundedIndices({
    wallet,
    from: 1,
    to: discoveryDepth - 1,
  });
  if (failedCount > 0) {
    return { error: ACCOUNT_DISCOVERY_FAILED_ERROR };
  }

  return { fundedIndices: funded };
};
