import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";

import { signTransaction } from "../signTransaction";

describe("signTransaction", () => {
  it("returns a transaction", async () => {
    const TEST_TRANSACTION = "AAA";
    extensionMessaging.sendMessageToContentScript = jest.fn().mockReturnValue({
      signedTransaction: TEST_TRANSACTION,
      signerAddress: "baz",
    });
    const transaction = await signTransaction();
    expect(transaction).toEqual({
      signedTxXdr: TEST_TRANSACTION,
      signerAddress: "baz",
    });
  });
  it("returns a transaction with signature", async () => {
    const TEST_TRANSACTION = "AAA";
    const TEST_SIGNATURE = "BBB";
    extensionMessaging.sendMessageToContentScript = jest.fn().mockReturnValue({
      signedTransaction: TEST_TRANSACTION,
      signerAddress: "baz",
      signature: TEST_SIGNATURE,
    });
    const transaction = await signTransaction();
    expect(transaction).toEqual({
      signedTxXdr: TEST_TRANSACTION,
      signerAddress: "baz",
      signature: TEST_SIGNATURE,
    });
  });

  it("returns a generic error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: "baz" });
    const transaction = await signTransaction();

    expect(transaction).toEqual({
      signedTxXdr: "",
      signerAddress: "",
      signature: "",
      error: "baz",
    });
  });
});
