import { getSorobanRpcUrl } from "../sorobanRpcUrl";

describe("getSorobanRpcUrl", () => {
  it("should return testnet rpc url", () => {
    expect(getSorobanRpcUrl({ network: "TESTNET" })).toEqual(
      "https://soroban-testnet.stellar.org/",
    );
  });
  it("should return futurenet rpc url", () => {
    expect(getSorobanRpcUrl({ network: "FUTURENET" })).toEqual(
      "https://rpc-futurenet.stellar.org/",
    );
  });
});
