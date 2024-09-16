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
  "watchWalletChanges",
];

const GUIDE_BASE_PATH = "guide";
const guidePaths = [
  "introduction",
  "gettingStarted",
  "account",
  "usingFreighterWebApp",
  "usingFreighterBrowser",
  "advancedSettings",
  "addAsset",
  "makePayment",
  "signXdr",
];

const constructPaths = (paths, basePath) =>
  paths.map((path) => `${basePath}/${path}`);

module.exports = {
  someSidebar: {
    "User Guide": constructPaths(guidePaths, GUIDE_BASE_PATH),
    Playground: constructPaths(playgroundPaths, PLAYGROUND_BASE_PATH),
  },
};
