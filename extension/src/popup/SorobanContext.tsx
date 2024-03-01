import React from "react";
import { useSelector } from "react-redux";
import { BASE_FEE, SorobanRpc, TransactionBuilder } from "stellar-sdk";

import { SOROBAN_RPC_URLS, NETWORKS } from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export const hasSorobanClient = (
  context: SorobanContextInterface,
): context is Required<SorobanContextInterface> =>
  context.server !== undefined && context.newTxBuilder !== undefined;

export interface SorobanContextInterface {
  server: SorobanRpc.Server;
  newTxBuilder: (fee?: string) => Promise<TransactionBuilder>;
}

export const SorobanContext = React.createContext(
  {} as SorobanContextInterface,
);

export const SorobanProvider = ({
  children,
  pubKey,
}: {
  children: React.ReactNode;
  pubKey: string;
}) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  let server: SorobanContextInterface["server"];
  let newTxBuilder: SorobanContextInterface["newTxBuilder"];
  if (!networkDetails.sorobanRpcUrl) {
    // handle any issues with a network missing sorobanRpcUrl
    let serverUrl;

    switch (networkDetails.network) {
      case NETWORKS.FUTURENET:
        serverUrl = SOROBAN_RPC_URLS[NETWORKS.FUTURENET];
        break;
      case NETWORKS.TESTNET:
        serverUrl = SOROBAN_RPC_URLS[NETWORKS.TESTNET];
        break;
      case NETWORKS.PUBLIC:
        serverUrl = SOROBAN_RPC_URLS[NETWORKS.PUBLIC];
        break;
      default:
        serverUrl = "";
    }

    server = new SorobanRpc.Server(serverUrl, {
      allowHttp: serverUrl.startsWith("http://"),
    });

    newTxBuilder = async (fee = BASE_FEE) => {
      const sourceAccount = await server!.getAccount(pubKey);
      return new TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase: networkDetails.networkPassphrase,
      });
    };
  } else {
    server = new SorobanRpc.Server(networkDetails.sorobanRpcUrl, {
      allowHttp: networkDetails.sorobanRpcUrl.startsWith("http://"),
    });

    newTxBuilder = async (fee = BASE_FEE) => {
      const sourceAccount = await server!.getAccount(pubKey);
      return new TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase: networkDetails.networkPassphrase,
      });
    };
  }

  return (
    <SorobanContext.Provider value={{ server, newTxBuilder }}>
      {children}
    </SorobanContext.Provider>
  );
};
