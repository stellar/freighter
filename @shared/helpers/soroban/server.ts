import {
  Transaction,
  Memo,
  MemoType,
  Operation,
  SorobanRpc,
  scValToNative,
  BASE_FEE,
  TransactionBuilder,
} from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";

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

export const buildSorobanServer = (serverUrl: string) => {
  return new SorobanRpc.Server(serverUrl, {
    allowHttp: serverUrl.startsWith("http://"),
  });
};

export const getNewTxBuilder = async (
  publicKey: string,
  networkDetails: NetworkDetails,
  server: SorobanRpc.Server,
  fee = BASE_FEE,
) => {
  const sourceAccount = await server.getAccount(publicKey);
  return new TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: networkDetails.networkPassphrase,
  });
};
