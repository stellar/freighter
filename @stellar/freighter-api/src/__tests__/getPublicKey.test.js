import { getPublicKey } from "../getPublicKey";
import * as apiExternal from "@shared/api/external";

describe("getPublicKey", () => {
  it("returns a publicKey", async () => {
    const TEST_KEY = "100";
    apiExternal.requestPublicKey = jest.fn().mockReturnValue(TEST_KEY);
    const publicKey = await getPublicKey();
    expect(publicKey).toBe(TEST_KEY);
  });
  it("throws an error", async () => {
    const TEST_ERROR = "Error!";
    apiExternal.requestPublicKey = jest.fn().mockImplementation(() => {
      throw TEST_ERROR;
    });
    expect(getPublicKey).toThrowError(TEST_ERROR);
  });
});
