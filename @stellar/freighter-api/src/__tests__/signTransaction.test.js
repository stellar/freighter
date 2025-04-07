import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import * as ApiExternal from "@shared/api/external";

import { signTransaction } from "../signTransaction";

describe("signTransaction", () => {
  it("returns a transaction", async () => {
    const TEST_TRANSACTION = "AAA";
    extensionMessaging.sendMessageToContentScript = jest.fn().mockReturnValue({
      signedTransaction: TEST_TRANSACTION,
      signerAddress: "baz",
    });
    ApiExternal.requestAllowedStatus = jest.fn().mockImplementationOnce(() => ({
      isAllowed: true,
    }));
    const transaction = await signTransaction();
    expect(transaction).toEqual({
      signedTxXdr: TEST_TRANSACTION,
      signerAddress: "baz",
    });
  });
  it("returns a generic error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: "baz" });
    ApiExternal.requestAllowedStatus = jest.fn().mockImplementationOnce(() => ({
      isAllowed: true,
    }));
    const transaction = await signTransaction();

    expect(transaction).toEqual({
      signedTxXdr: "",
      signerAddress: "",
      error: "baz",
    });
  });
});
