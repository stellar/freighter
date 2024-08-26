import { StrKey } from "stellar-sdk";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

export const getAssetDomain = async (
  issuerKey: string,
  networkUrl: string,
  networkPassphrase: string,
) => {
  const server = stellarSdkServer(networkUrl, networkPassphrase);
  if (StrKey.isValidEd25519PublicKey(issuerKey)) {
    const acct = await server.loadAccount(issuerKey);

    return acct.home_domain || "";
  }

  return "";
};
