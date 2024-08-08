import * as publicInterface from "@stellar/freighter-api";

describe.each(Object.keys(publicInterface.default))("%s", (fn) => {
  test("exits gracefully in node", async () => {
    // just call the function and make sure it doesn't throw
    // in node, all of them should exit gracefully before even checking args, so we can pass nothing

    if (fn === "WatchWalletChanges") {
      // WatchWalletChanges is a class so we need to instantiate it
      await new publicInterface[fn]();
    } else {
      await publicInterface[fn]();
    }
  });
});
