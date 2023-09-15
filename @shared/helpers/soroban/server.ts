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
  const simulatedTX = await server.simulateTransaction(tx);

  // @ts-ignore
  if (!simulatedTX?.result) {
    throw new Error("Invalid response from simulateTransaction");
  }

  // @ts-ignore
  const scVal = xdr.ScVal.fromXDR(simulatedTX?.result.xdr, "base64");

  return scValToNative(scVal);
};
