import {
  Transaction,
  Memo,
  MemoType,
  Operation,
  SorobanRpc,
  scValToNative,
  BASE_FEE,
} from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";

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

export const buildSorobanServer = (
  serverUrl: string,
  networkPassphrase: string,
) => {
  const Sdk = getSdk(networkPassphrase);

  return new Sdk.SorobanRpc.Server(serverUrl, {
    allowHttp: serverUrl.startsWith("http://"),
  });
};

export const getNewTxBuilder = async (
  publicKey: string,
  networkDetails: NetworkDetails,
  server: SorobanRpc.Server,
  fee = BASE_FEE,
) => {
  const Sdk = getSdk(networkDetails.networkPassphrase);
  const sourceAccount = await server.getAccount(publicKey);
  return new Sdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: networkDetails.networkPassphrase,
  });
};
