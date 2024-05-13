import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

export const getAssetDomain = async (
  issuerKey: string,
  networkUrl: string,
  networkPassphrase: string,
) => {
  const server = stellarSdkServer(networkUrl, networkPassphrase);
  const acct = await server.loadAccount(issuerKey);

  return acct.home_domain || "";
};
