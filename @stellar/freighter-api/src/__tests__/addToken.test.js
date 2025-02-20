import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import { addToken } from "../addToken";

describe("addToken", () => {
  it("returns contract id with no error", async () => {
    const TEST_CONTRACT_ID = "TEST_CONTRACT_ID";
    extensionMessaging.sendMessageToContentScript = jest.fn().mockReturnValue({
      contractId: TEST_CONTRACT_ID,
    });
    const response = await addToken({ contractId: TEST_CONTRACT_ID });
    expect(response).toEqual({
      contractId: TEST_CONTRACT_ID,
    });
  });
  it("returns an error", async () => {
    const TEST_ERROR = "TEST_ERROR";
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ contractId: "", apiError: TEST_ERROR });
    const response = await addToken({ contractId: "" });

    expect(response).toEqual({
      contractId: "",
      error: TEST_ERROR,
    });
  });
});
