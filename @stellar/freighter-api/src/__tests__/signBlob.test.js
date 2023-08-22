import * as apiExternal from "@shared/api/external";
import { signBlob } from "../signBlob";

describe("signBlob", () => {
  it("returns a signed blob", async () => {
    const TEST_BLOB = atob("AAA");
    apiExternal.submitBlob = jest.fn().mockReturnValue(TEST_BLOB);
    const blob = await signBlob();
    expect(blob).toBe(TEST_BLOB);
  });

  it("blob can be verified", async () => {
    const kp = Keypair.fromPublicKey(
      "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O"
    );
    const TEST_BLOB = atob("AAA");
    apiExternal.submitBlob = jest.fn().mockReturnValue(TEST_BLOB);
    const blob = await signBlob();
    expect(blob).toBe(TEST_BLOB);
  });

  it("throws a generic error", () => {
    const TEST_ERROR = "Error!";
    apiExternal.submitBlob = jest.fn().mockImplementation(() => {
      throw TEST_ERROR;
    });
    expect(signBlob).toThrowError(TEST_ERROR);
  });
});
