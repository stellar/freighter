import {
  subscribeTokenBalance,
  subscribeTokenHistory,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";

interface Args {
  contractId: string;
  network: string;
  publicKey: string;
}

type AddTokenWithContractIdResult = {
  accountTokenIdList: string[];
  error?: string;
};

export const addTokenWithContractId = async ({
  args,
  localStore,
}: {
  args: Args;
  localStore: DataStorageAccess;
}): Promise<AddTokenWithContractIdResult> => {
  const { contractId: tokenId, network, publicKey } = args;

  const tokenIdsByNetwork = (await localStore.getItem(TOKEN_ID_LIST)) || {};
  const tokenIdList = tokenIdsByNetwork[network] || {};
  const keyId = (await localStore.getItem(KEY_ID)) || "";

  const storedAccountTokenIdList = tokenIdList[keyId];
  const accountTokenIdList = Array.isArray(storedAccountTokenIdList)
    ? (storedAccountTokenIdList as string[])
    : [];

  if (accountTokenIdList.includes(tokenId)) {
    return { accountTokenIdList };
  }

  try {
    accountTokenIdList.push(tokenId);
    await localStore.setItem(TOKEN_ID_LIST, {
      ...tokenIdsByNetwork,
      [network]: {
        ...tokenIdList,
        [keyId]: accountTokenIdList,
      },
    });
  } catch (error) {
    console.error(error);
    // Persisting the token failed. Surface it — the caller decides whether to
    // swallow it (SAC/classic, where the on-chain trustline is the real
    // operation) or report it to the dApp (SEP-41, where this write is the
    // whole operation and a silent failure would claim a token was added that
    // isn't there on reload).
    return { accountTokenIdList, error: "Failed to add token" };
  }

  // Fire-and-forget best-effort subscriptions. These are slow indexer calls and
  // must NOT block the dApp response: the caller resolves the request right
  // after this returns, and the popup may close immediately after. Awaiting
  // them would delay response() past a window-close, which resolves the request
  // as "declined" — reporting a rejection for a trustline that actually
  // succeeded. The token is already stored above; subscriptions are a non-
  // essential nicety that can complete (or fail) in the background.
  void (async () => {
    try {
      await subscribeTokenBalance({ publicKey, contractId: tokenId, network });
      await subscribeTokenHistory({ publicKey, contractId: tokenId, network });
    } catch (error) {
      console.error(error);
    }
  })();

  return { accountTokenIdList };
};
