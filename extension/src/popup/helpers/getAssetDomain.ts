import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

export const getAssetDomain = async (issuerKey: string, networkUrl: string) => {
  const server = stellarSdkServer(networkUrl);
  const acct = await server.loadAccount(issuerKey);

  return acct.home_domain || "";
};
