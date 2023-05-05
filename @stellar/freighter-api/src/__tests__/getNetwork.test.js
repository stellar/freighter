import * as apiExternal from "@shared/api/external";
import { getNetwork } from "../getNetwork";

jest.mock("@shared/api/external");

describe("getNetwork", () => {
  it("returns a network", async () => {
    const TEST_NETWORK = "PUBLIC";
    apiExternal.requestNetwork = jest.fn().mockReturnValue(TEST_NETWORK);
    const network = await getNetwork();
    expect(network).toBe(TEST_NETWORK);
  });
  it("throws an error", () => {
    const TEST_ERROR = "Error!";
    apiExternal.requestNetwork = jest.fn().mockImplementation(() => {
      throw TEST_ERROR;
    });
    expect(getNetwork).toThrowError(TEST_ERROR);
  });
});
