import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";

interface Args {
  contractId: string;
  network: string;
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
  const { contractId: tokenId, network } = args;

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

  return { accountTokenIdList };
};
