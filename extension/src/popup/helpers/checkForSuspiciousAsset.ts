import { Horizon, StellarToml } from "stellar-sdk";
import { Horizon as HorizonNext } from "stellar-sdk-next";
import { NetworkDetails } from "@shared/constants/stellar";
import { NewAssetFlags } from "popup/components/manageAssets/ManageAssetRows";

export const checkForSuspiciousAsset = async ({
  code,
  issuer,
  domain,
  server,
}: {
  code: string;
  issuer: string;
  domain: string;
  server: Horizon.Server | HorizonNext.Server;
  networkDetails: NetworkDetails;
}): Promise<NewAssetFlags> => {
  // check revocable
  let isRevocable = false;
  try {
    const resp = await server.assets().forCode(code).forIssuer(issuer).call();
    isRevocable = resp.records[0]
      ? resp.records[0]?.flags?.auth_revocable
      : false;
  } catch (e) {
    console.error(e);
  }

  // check domain
  let isInvalidDomain = false;

  if (domain) {
    try {
      const domainWithoutProtocol = domain.replace(/https?:\/\//, "");
      const resp = await StellarToml.Resolver.resolve(domainWithoutProtocol);
      let found = false;
      (resp?.CURRENCIES || []).forEach(
        (c: { code?: string; issuer?: string }) => {
          if (c.code === code && c.issuer === issuer) {
            found = true;
          }
        },
      );
      isInvalidDomain = !found;
    } catch (e) {
      console.error(e);
      isInvalidDomain = true;
    }
  }

  return { isRevocable, isInvalidDomain };
};
