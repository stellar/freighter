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
export const addTokenWithContractId = async ({
  args,
  localStore,
}: {
  args: Args;
  localStore: DataStorageAccess;
}) => {
  const { contractId: tokenId, network, publicKey } = args;

  const tokenIdsByNetwork = (await localStore.getItem(TOKEN_ID_LIST)) || {};
  const tokenIdList = tokenIdsByNetwork[network] || {};
  const keyId = (await localStore.getItem(KEY_ID)) || "";

  const accountTokenIdList = tokenIdList[keyId] || [];

  if (accountTokenIdList.includes(tokenId)) {
    return { error: "Token ID already exists" };
  }

  try {
    await subscribeTokenBalance({ publicKey, contractId: tokenId, network });
    await subscribeTokenHistory({ publicKey, contractId: tokenId, network });

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
    return { error: "Failed to subscribe to token details" };
  }

  return { accountTokenIdList };
};
