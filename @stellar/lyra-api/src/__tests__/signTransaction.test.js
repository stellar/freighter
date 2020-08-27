import { signTransaction } from "../signTransaction";
import * as apiExternal from "@shared/api/external";

describe("signTransaction", () => {
  it("returns a transaction", async () => {
    const TEST_TRANSACTION = "AAA";
    apiExternal.submitTransaction = jest.fn().mockReturnValue(TEST_TRANSACTION);
    const transaction = await signTransaction();
    expect(transaction).toBe(TEST_TRANSACTION);
  });
  it("throws an error", async () => {
    const TEST_ERROR = "Error!";
    apiExternal.submitTransaction = jest.fn().mockImplementation(() => {
      throw TEST_ERROR;
    });
    expect(signTransaction).toThrowError(TEST_ERROR);
  });
});
