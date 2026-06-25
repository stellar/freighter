import { Buffer } from "buffer";

import { AUTH_SALT, deriveAuthSeed } from "../deriveAuthKeypair";
import { AUTH_KEYPAIR_VECTORS } from "./authKeypairVectors";

describe("deriveAuthSeed (HMAC step)", () => {
  it("uses the versioned domain-separation salt", () => {
    expect(AUTH_SALT).toBe("freighter-auth-v1");
  });

  it.each(AUTH_KEYPAIR_VECTORS)(
    "reproduces the committed authSeed for %#",
    async ({ mnemonic, authSeedHex }) => {
      const seed = await deriveAuthSeed(mnemonic);
      expect(seed).toHaveLength(32);
      expect(Buffer.from(seed).toString("hex")).toBe(authSeedHex);
    },
  );
});
