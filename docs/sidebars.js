const PLAYGROUND_BASE_PATH = "playground";
const playgroundPaths = [
  "isConnected",
  "isAllowed",
  "setAllowed",
  "requestAccess",
  "getAddress",
  "getNetwork",
  "getNetworkDetails",
  "signTransaction",
  "signAuthEntry",
  "signMessage",
  "addToken",
  "watchWalletChanges",
];

const GUIDE_BASE_PATH = "guide";
const introPaths = ["introduction", "gettingStarted"];
const userGuidePaths = [
  "whatsNew",
  "account",
  "advancedSettings",
  "addToken",
  "addAsset",
  "makePayment",
  "signXdr",
];
const techGuidePaths = [
  "usingFreighterWebApp",
  "usingFreighterBrowser",
  "developingForSoroban",
  "thirdPartyIntegration",
];

const constructPaths = (paths, basePath) =>
  paths.map((path) => `${basePath}/${path}`);

module.exports = {
  someSidebar: {
    Introduction: constructPaths(introPaths, GUIDE_BASE_PATH),
    "User Guide": constructPaths(userGuidePaths, GUIDE_BASE_PATH),
    "Technical Guide": constructPaths(techGuidePaths, GUIDE_BASE_PATH),
    Playground: constructPaths(playgroundPaths, PLAYGROUND_BASE_PATH),
  },
};
