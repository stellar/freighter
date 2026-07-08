import { SERVICE_TYPES } from "@shared/constants/services";
import { signOnrampProof } from "../handlers/signOnrampProof";
import { Keypair } from "stellar-sdk";

const kp = Keypair.fromSecret(
  "SD5DCN3MCRG34UXFRC3ZMQYLNKJC7ZBD6NZBJX3YNUMH2GBTFWQY544O",
);

jest.mock("background/helpers/session", () => ({
  getEncryptedTemporaryData: jest.fn(),
}));
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

describe("signOnrampProof handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require("background/helpers/session").getEncryptedTemporaryData.mockResolvedValue(
      kp.secret(),
    );
  });

  it("returns a proof token for the active key", async () => {
    const res = await signOnrampProof({
      request: {
        type: SERVICE_TYPES.SIGN_ONRAMP_PROOF,
        activePublicKey: kp.publicKey(),
        body: {},
      },
      localStore: {
        getItem: jest.fn().mockResolvedValue("mock-key-id"),
      } as any,
      sessionStore: {} as any,
    });
    expect(res.proof).toBeDefined();
    const [payloadB64] = res.proof!.split(".");
    const claims = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    expect(claims.sub).toEqual(kp.publicKey());
    expect(claims.path).toEqual("/api/v1/onramp/token");
  });

  it("returns an error when no private key is available", async () => {
    require("background/helpers/session").getEncryptedTemporaryData.mockRejectedValueOnce(
      new Error("locked"),
    );
    const res = await signOnrampProof({
      request: {
        type: SERVICE_TYPES.SIGN_ONRAMP_PROOF,
        activePublicKey: kp.publicKey(),
        body: {},
      },
      localStore: {
        getItem: jest.fn().mockResolvedValue("mock-key-id"),
      } as any,
      sessionStore: {} as any,
    });
    expect(res.error).toBeDefined();
    expect(res.proof).toBeUndefined();
  });
});
