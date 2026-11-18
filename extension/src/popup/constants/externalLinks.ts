import { NETWORKS } from "@shared/constants/stellar";

// External documentation and tutorial URLs
export const STELLAR_DOCS_CREATE_ACCOUNT_URL =
  "https://developers.stellar.org/docs/tutorials/create-account/#create-account";

// "How much XLM do I need in my wallet?" help article.
export const XLM_RESERVE_HELP_URL =
  "https://help.varialwallet.com/article/xjlva9dxov-how-much-xlm-do-i-need-in-my-wallet";

// Blend's app, per network. The Earn picker's pool chip and the pool sheet's
// "View pool details" open it, as on mobile.
const BLEND_APP_URLS: Partial<Record<NETWORKS, string>> = {
  [NETWORKS.PUBLIC]: "https://mainnet.blend.capital/",
  [NETWORKS.TESTNET]: "https://testnet.blend.capital/",
};

// Blend's app for the network the user is on, so testnet users see the
// testnet pools. Mainnet's for any other network, though Earn only runs where
// a pool is allowlisted.
export const getBlendAppUrl = (network: string): string =>
  BLEND_APP_URLS[network as NETWORKS] ?? BLEND_APP_URLS[NETWORKS.PUBLIC]!;
