import FreighterAPI from "../index";

describe("freighter API", () => {
  it("has keys", () => {
    expect(typeof FreighterAPI.isConnected).toBe("function");
    expect(typeof FreighterAPI.getAddress).toBe("function");
    expect(typeof FreighterAPI.addToken).toBe("function");
    expect(typeof FreighterAPI.signTransaction).toBe("function");
    expect(typeof FreighterAPI.signMessage).toBe("function");
    expect(typeof FreighterAPI.signAuthEntry).toBe("function");
  });
});
