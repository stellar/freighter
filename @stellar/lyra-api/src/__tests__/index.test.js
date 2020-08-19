import LyraAPI from "../index";

describe("lyra API", () => {
  it("has keys", () => {
    expect(typeof LyraAPI.isConnected).toBe("function");
    expect(typeof LyraAPI.getPublicKey).toBe("function");
    expect(typeof LyraAPI.signTransaction).toBe("function");
  });
});
