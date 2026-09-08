import { verifyQuote, ReserveVerificationError } from "../reserve";
import type { ReserveRequest, QuotePayload } from "../reserve/types";

const SOURCE = "GDTO3QIHYEA4KU6QEJP7Q5NEDMVLOZ56XS752XRVP6GMRRBS34OT2L6X";
const DEST = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";
const SPONSOR = "GCQQW2N47QLQ6ISSP2IRHNFBQ5KFYJ4L74PXVIDHXNDGKHN3FDVCZ6RT";
const USDC = "USDC:GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";

const request: ReserveRequest = {
  source: SOURCE,
  feeToken: USDC,
  maxSendStroops: "10000000",
  ops: [{ type: "payment", destination: DEST, asset: USDC, amount: "1" }],
};

const payload = (): QuotePayload => ({
  network: "Test SDF Network ; September 2015",
  mode: "sponsored",
  source: SOURCE,
  sponsor: SPONSOR,
  ops: [{ type: "payment", destination: DEST, asset: USDC, amount: "1" }],
  fee_token: USDC,
  charge_stroops: 1000,
  send_max_stroops: 50_000,
  path: [],
  reserve_stroops: 0,
  sequence: "1",
  inner_fee_stroops: 100,
  min_time: 0,
  max_time: 0,
  expires_at_ledger: 1,
});

describe("verifyQuote", () => {
  it("accepts a quote that matches what the wallet asked", () => {
    expect(() => verifyQuote(payload(), request)).not.toThrow();
  });

  it("refuses a quote that would spend more than the wallet allowed", () => {
    expect(() =>
      verifyQuote({ ...payload(), send_max_stroops: 20_000_000 }, request),
    ).toThrow(ReserveVerificationError);
  });

  it("refuses a quote that changes the payment", () => {
    expect(() =>
      verifyQuote(
        {
          ...payload(),
          ops: [{ type: "payment", destination: DEST, asset: USDC, amount: "9" }],
        },
        request,
      ),
    ).toThrow(ReserveVerificationError);
  });

  it("refuses a quote that takes the fee in a different token", () => {
    expect(() =>
      verifyQuote({ ...payload(), fee_token: "native" }, request),
    ).toThrow(ReserveVerificationError);
  });
});
