import {
  Transaction,
  Memo,
  MemoType,
  Operation,
  Server,
  xdr,
  scValToNative,
} from "soroban-client";

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

  return scValToNative(scVal);
};
