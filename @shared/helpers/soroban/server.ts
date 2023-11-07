import {
  Transaction,
  Memo,
  MemoType,
  Operation,
  SorobanRpc,
  scValToNative,
} from "stellar-sdk";

export const simulateTx = async <ArgType>(
  tx: Transaction<Memo<MemoType>, Operation[]>,
  server: SorobanRpc.Server,
): Promise<ArgType> => {
  const simulatedTX = await server.simulateTransaction(tx);

  if ("result" in simulatedTX && simulatedTX.result !== undefined) {
    return scValToNative(simulatedTX.result.retval);
  }

  throw new Error("Invalid response from simulateTransaction");
};
