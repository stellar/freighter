import { NETWORKS, NetworkDetails } from "@shared/constants/stellar";

// USDe and sUSDe, and the Sushi and Stargate pages the promo links to, are
// Mainnet's. A network the user added doesn't count, even one pointed at
// Mainnet: it's saved as a custom network, not as Mainnet.
export const isEthenaLaunchNetwork = (networkDetails: NetworkDetails) =>
  networkDetails.network === NETWORKS.PUBLIC;
