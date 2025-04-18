import { FundAccountMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const fundAccount = async ({
  request,
  localStore,
}: {
  request: FundAccountMessage;
  localStore: DataStorageAccess;
}) => {
  const { publicKey } = request;

  const { friendbotUrl } = await getNetworkDetails({ localStore });

  if (friendbotUrl) {
    try {
      await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`);
    } catch (e) {
      console.error(e);
      throw new Error("Error creating account");
    }
  }

  return { publicKey };
};
