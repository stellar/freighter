import {
  Transaction,
  Memo,
  MemoType,
  Operation,
  Server,
  xdr,
  scValToNative,
} from "soroban-client";
import { captureException } from "@sentry/browser";

export const simulateTx = async <ArgType>(
  tx: Transaction<Memo<MemoType>, Operation[]>,
  server: Server,
): Promise<ArgType> => {
  const { results } = await server.simulateTransaction(tx);
  if (!results || results.length !== 1) {
    throw new Error("Invalid response from simulateTransaction");
  }
  const result = results[0];
  const scVal = xdr.ScVal.fromXDR(result.xdr, "base64");
  let convertedScVal: any;
  try {
    // handle a case where scValToNative doesn't properly handle scvString
    convertedScVal = scVal.str().toString();
    return convertedScVal;
  } catch (e) {
    console.error(e);
    captureException(`Failed to convert SCVal to native val, ${e}`);
  }
  return scValToNative(scVal);
};
