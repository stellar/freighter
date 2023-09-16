import {
  Transaction,
  Memo,
  MemoType,
  Operation,
  Server,
  scValToNative,
} from "soroban-client";

export const simulateTx = async <ArgType>(
  tx: Transaction<Memo<MemoType>, Operation[]>,
  server: Server,
): Promise<ArgType> => {
  const simulatedTX = await server.simulateTransaction(tx);

  if ("result" in simulatedTX && simulatedTX.result !== undefined) {
    return scValToNative(simulatedTX.result.retval);
  }

  throw new Error("Invalid response from simulateTransaction")
};
