import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import {
  SOROBAN_RPC_URLS,
  NETWORKS
} from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export const hasSorobanClient = (
  context: SorobanContextInterface,
): context is Required<SorobanContextInterface> =>
  context.server !== undefined && context.newTxBuilder !== undefined;

export interface SorobanContextInterface {
  server?: SorobanClient.Server;
  newTxBuilder?: (fee?: string) => Promise<SorobanClient.TransactionBuilder>;
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

  let server: SorobanContextInterface['server']
  let newTxBuilder: SorobanContextInterface['newTxBuilder']
  if (!networkDetails.sorobanRpcUrl && networkDetails.network === NETWORKS.FUTURENET) {
    // TODO: after enough time has passed to assume most clients have ran
    // the migrateSorobanRpcUrlNetworkDetails migration, remove and use networkDetails.sorobanRpcUrl
    const serverUrl = SOROBAN_RPC_URLS[NETWORKS.FUTURENET]!

    server = new SorobanClient.Server(serverUrl, {
      allowHttp: serverUrl.startsWith("http://"),
    });

    newTxBuilder = async (fee = SorobanClient.BASE_FEE) => {
      const sourceAccount = await server!.getAccount(pubKey);
      return new SorobanClient.TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase: networkDetails.networkPassphrase,
      });
    };
  } else if (networkDetails.sorobanRpcUrl) {
    server = new SorobanClient.Server(networkDetails.sorobanRpcUrl, {
      allowHttp: networkDetails.sorobanRpcUrl.startsWith("http://"),
    });

    newTxBuilder = async (fee = SorobanClient.BASE_FEE) => {
      const sourceAccount = await server!.getAccount(pubKey);
      return new SorobanClient.TransactionBuilder(sourceAccount, {
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
