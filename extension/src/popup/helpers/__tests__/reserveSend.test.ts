import { Networks } from "stellar-sdk";

import { ReserveSendError, quoteAndBuildReservePayment, quoteAndBuildReserveSwap } from "../reserve";

const SOURCE = "GDTO3QIHYEA4KU6QEJP7Q5NEDMVLOZ56XS752XRVP6GMRRBS34OT2L6X";
const DEST = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";
const USDC = "USDC:GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";

describe("quoteAndBuildReservePayment guards", () => {
  const base = {
    publicKey: SOURCE,
    destination: DEST,
    sendAsset: USDC,
    sendAmount: "1",
    feeAsset: USDC,
    feeTokenAvailable: "5",
    networkPassphrase: Networks.TESTNET,
  };

  it("refuses a memo", async () => {
    await expect(
      quoteAndBuildReservePayment({
        ...base,
        isDestinationFunded: true,
        memo: "hello",
      }),
    ).rejects.toMatchObject({
      name: "ReserveSendError",
      i18nKey: "Memo is not supported when paying the fee with a token.",
    });
  });

  it("refuses an unfunded destination", async () => {
    await expect(
      quoteAndBuildReservePayment({
        ...base,
        isDestinationFunded: false,
      }),
    ).rejects.toBeInstanceOf(ReserveSendError);
  });

  it("refuses when the send would leave nothing for the fee", async () => {
    await expect(
      quoteAndBuildReservePayment({
        ...base,
        sendAmount: "5",
        feeTokenAvailable: "5",
        isDestinationFunded: true,
      }),
    ).rejects.toMatchObject({
      i18nKey: "Keep some {{asset}} to pay the network fee.",
    });
  });
});

describe("quoteAndBuildReserveSwap guards", () => {
  const base = {
    publicKey: SOURCE,
    sendAsset: USDC,
    sendAmount: "1",
    destAsset: "native",
    destinationAmount: "5",
    allowedSlippage: "2",
    path: [] as string[],
    requiresTrustline: false,
    feeAsset: USDC,
    feeTokenAvailable: "5",
    networkPassphrase: Networks.TESTNET,
  };

  it("refuses a memo", async () => {
    await expect(
      quoteAndBuildReserveSwap({
        ...base,
        memo: "hello",
      }),
    ).rejects.toMatchObject({
      name: "ReserveSendError",
      i18nKey: "Memo is not supported when paying the fee with a token.",
    });
  });

  it("refuses when the send would leave nothing for the fee", async () => {
    await expect(
      quoteAndBuildReserveSwap({
        ...base,
        sendAmount: "5",
        feeTokenAvailable: "5",
      }),
    ).rejects.toMatchObject({
      i18nKey: "Keep some {{asset}} to pay the network fee.",
    });
  });
});
