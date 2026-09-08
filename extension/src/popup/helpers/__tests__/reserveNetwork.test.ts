import { HOSTED } from "@cavos/reserve";
import { Networks } from "stellar-sdk";

import {
  createReserveClient,
  isReserveConfigured,
  isReserveNetwork,
  reserveNetwork,
  resolveReserveUrl,
} from "../reserve";

describe("reserve network", () => {
  it("maps classic passphrases and ignores the rest", () => {
    expect(reserveNetwork(Networks.TESTNET)).toBe("testnet");
    expect(reserveNetwork(Networks.PUBLIC)).toBe("mainnet");
    expect(reserveNetwork(Networks.FUTURENET)).toBeNull();
    expect(isReserveNetwork(Networks.TESTNET)).toBe(true);
    expect(isReserveNetwork(Networks.PUBLIC)).toBe(true);
    expect(isReserveNetwork(Networks.FUTURENET)).toBe(false);
  });

  it("uses hosted lanes when no origin is set", () => {
    expect(resolveReserveUrl("", "testnet")).toBe(HOSTED.testnet.url);
    expect(resolveReserveUrl("", "mainnet")).toBe(HOSTED.mainnet.url);
  });

  it("keeps a loopback origin as a single lane", () => {
    expect(resolveReserveUrl("http://127.0.0.1:8099", "testnet")).toBe(
      "http://127.0.0.1:8099",
    );
    expect(resolveReserveUrl("http://localhost:8099/", "mainnet")).toBe(
      "http://localhost:8099",
    );
  });

  it("appends the lane on a hosted-style origin", () => {
    expect(resolveReserveUrl("https://reserve.cavos.xyz", "testnet")).toBe(
      "https://reserve.cavos.xyz/testnet",
    );
    expect(resolveReserveUrl("https://reserve.cavos.xyz", "mainnet")).toBe(
      "https://reserve.cavos.xyz/mainnet",
    );
  });

  it("honors a pinned lane and refuses the other network", () => {
    expect(
      resolveReserveUrl("https://reserve.cavos.xyz/testnet", "testnet"),
    ).toBe("https://reserve.cavos.xyz/testnet");
    expect(
      resolveReserveUrl("https://reserve.cavos.xyz/testnet", "mainnet"),
    ).toBeNull();
  });

  it("builds a hosted client for Testnet and Public", () => {
    const testnet = createReserveClient(Networks.TESTNET);
    const mainnet = createReserveClient(Networks.PUBLIC);
    expect(testnet).not.toBeNull();
    expect(mainnet).not.toBeNull();
    expect(createReserveClient(Networks.FUTURENET)).toBeNull();
    expect(isReserveConfigured(Networks.TESTNET)).toBe(true);
    expect(isReserveConfigured(Networks.PUBLIC)).toBe(true);
    expect(isReserveConfigured(Networks.FUTURENET)).toBe(false);
  });
});
