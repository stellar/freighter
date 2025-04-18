import { Store } from "redux";

import {
  GrantAccessMessage,
  ResponseQueue,
} from "@shared/api/types/message-request";
import { publicKeySelector } from "background/ducks/session";
import { getPunycodedDomain, getUrlHostname } from "helpers/urls";
import {
  getNetworkDetails,
  setAllowListDomain,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const grantAccess = async ({
  request,
  sessionStore,
  responseQueue,
  localStore,
}: {
  request: GrantAccessMessage;
  sessionStore: Store;
  responseQueue: ResponseQueue;
  localStore: DataStorageAccess;
}) => {
  const { url = "" } = request;
  const sanitizedUrl = getUrlHostname(url);
  const punycodedDomain = getPunycodedDomain(sanitizedUrl);
  const publicKey = publicKeySelector(sessionStore.getState());
  const networkDetails = await getNetworkDetails({ localStore });

  // TODO: right now we're just grabbing the last thing in the queue, but this should be smarter.
  // Maybe we need to search through responses to find a matching reponse :thinking_face
  const response = responseQueue.pop();

  await setAllowListDomain({
    publicKey,
    networkDetails,
    domain: punycodedDomain,
    localStore,
  });

  if (typeof response === "function") {
    return response(url);
  }

  return { error: "Access was denied" };
};
