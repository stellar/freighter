import { Store } from "redux";
import { captureException } from "@sentry/browser";
import { Keypair } from "stellar-sdk";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KEY_ID } from "constants/localStorageTypes";
import { encodeSep53Message } from "helpers/stellar";
import {
  buildOnrampClaims,
  canonicalizeJson,
  assembleProofToken,
  ADDRESS_PROOF_DOMAIN,
} from "helpers/onrampProof";
import {
  SignOnrampProofMessage,
  SignOnrampProofResponse,
} from "@shared/api/types/message-request";

export const signOnrampProof = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: SignOnrampProofMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}): Promise<SignOnrampProofResponse> => {
  const keyId = (await localStore.getItem(KEY_ID)) || "";
  let privateKey = "";

  try {
    privateKey = await getEncryptedTemporaryData({
      localStore,
      sessionStore,
      keyName: keyId,
    });
  } catch (e) {
    captureException(`signOnrampProof: no private key: ${JSON.stringify(e)}`);
    return { error: "Session timed out" };
  }

  if (!privateKey.length) {
    return { error: "Session timed out" };
  }

  const sourceKeys = Keypair.fromSecret(privateKey);
  const claims = buildOnrampClaims({
    publicKey: sourceKeys.publicKey(),
    body: request.body ?? {},
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  const canonical = canonicalizeJson(claims);
  const signature = sourceKeys.sign(
    encodeSep53Message(ADDRESS_PROOF_DOMAIN + canonical),
  );

  return { proof: assembleProofToken(canonical, signature) };
};
