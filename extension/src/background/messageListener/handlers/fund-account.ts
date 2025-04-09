import { FundAccountMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";

export const fundAccount = async ({
  request,
}: {
  request: FundAccountMessage;
}) => {
  const { publicKey } = request;

  const { friendbotUrl } = await getNetworkDetails();

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
