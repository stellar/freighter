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
const userGuidePaths = [
  "introduction",
  "gettingStarted",
  "account",
  "advancedSettings",
  "addAsset",
  "makePayment",
  "signXdr",
];
const techGuidePaths = ["usingFreighterWebApp", "usingFreighterBrowser"];

const constructPaths = (paths, basePath) =>
  paths.map((path) => `${basePath}/${path}`);

module.exports = {
  someSidebar: {
    "User Guide": constructPaths(userGuidePaths, GUIDE_BASE_PATH),
    "Technical Guide": constructPaths(techGuidePaths, GUIDE_BASE_PATH),
    Playground: constructPaths(playgroundPaths, PLAYGROUND_BASE_PATH),
  },
};
