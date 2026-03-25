import { Store } from "redux";
import { captureException } from "@sentry/browser";

import {
  GrantAccessMessage,
  RequestAccessResponse,
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
  responseQueue: ResponseQueue<RequestAccessResponse>;
  localStore: DataStorageAccess;
}) => {
  const { url = "", uuid } = request;

  if (!uuid) {
    captureException("grantAccess: missing uuid in request");
    return { error: "Access was denied" };
  }

  const sanitizedUrl = getUrlHostname(url);
  const punycodedDomain = getPunycodedDomain(sanitizedUrl);
  const publicKey = publicKeySelector(sessionStore.getState());
  const networkDetails = await getNetworkDetails({ localStore });

  const queueIndex = responseQueue.findIndex((item) => item.uuid === uuid);
  const responseQueueItem =
    queueIndex !== -1 ? responseQueue.splice(queueIndex, 1)[0] : undefined;

  if (!responseQueueItem || typeof responseQueueItem.response !== "function") {
    captureException(
      `grantAccess: no matching response found for uuid ${uuid}`,
    );
    return { error: "Access was denied" };
  }

  await setAllowListDomain({
    publicKey,
    networkDetails,
    domain: punycodedDomain,
    localStore,
  });

  return responseQueueItem.response(url, publicKey);
};
