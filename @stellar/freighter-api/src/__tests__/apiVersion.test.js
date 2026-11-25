import semver from "semver";
import webpack from "webpack";
import config from "../../webpack.common";

// Jest stubs __PACKAGE_VERSION__, so read what the real build injects.
const injectedApiVersion = () => {
  const define = config.plugins.find((p) => p instanceof webpack.DefinePlugin);
  return JSON.parse(define.definitions.__PACKAGE_VERSION__);
};

describe("injected apiVersion", () => {
  it("keeps the extension on the current signMessage/signAuthEntry response format", () => {
    expect(semver.gte(injectedApiVersion(), "4.2.0")).toBe(true);
  });
});
