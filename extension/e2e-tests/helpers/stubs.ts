import { USDC_TOKEN_ADDRESS } from "./test-token";

export const STELLAR_EXPERT_ASSET_LIST_JSON = {
  name: "StellarExpert Top 50",
  provider: "StellarExpert",
  description:
    "Dynamically generated list based on technical asset metrics, including payments and trading volumes, interoperability, userbase, etc. Assets included in this list were not verified by StellarExpert team. StellarExpert is not affiliated with issuers, and does not endorse or advertise assets in the list. Assets reported for fraudulent activity removed from the list automatically.",
  version: "1.0",
  network: "testnet",
  feedback: "https://stellar.expert",
  assets: [
    {
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      contract: USDC_TOKEN_ADDRESS,
      name: "USDC",
      org: "unknown",
      domain: "centre.io",
      decimals: 7,
    },
  ],
};
