const PLAYGROUND_BASE_PATH = "playground";
const playgroundPaths = [
  "isConnected",
  "isAllowed",
  "setAllowed",
  "requestAccess",
  "getPublicKey",
  "getUserInfo",
  "getNetwork",
  "getNetworkDetails",
  "signTransaction",
  "signAuthEntry",
  "signBlob",
  "getAddress",
];

const GUIDE_BASE_PATH = "guide";
const guidePaths = [
  "introduction",
  "gettingStarted",
  "usingFreighterWebApp",
  "usingFreighterBrowser",
];

const constructPaths = (paths, basePath) =>
  paths.map((path) => `${basePath}/${path}`);

module.exports = {
  someSidebar: {
    "User Guide": constructPaths(guidePaths, GUIDE_BASE_PATH),
    Playground: constructPaths(playgroundPaths, PLAYGROUND_BASE_PATH),
  },
};
