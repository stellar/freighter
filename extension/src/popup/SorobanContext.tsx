import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import {
  SOROBAN_RPC_URLS,
  NETWORKS
} from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export interface SorobanContextInterface {
  server?: SorobanClient.Server;
  newTxBuilder?: () => SorobanClient.TransactionBuilder;
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
  // Were only simluating so the fee here should not matter
  // AFAIK there is no fee stats for Soroban yet either
  const fee = "100";
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const source = new SorobanClient.Account(pubKey, "0");

  let server: SorobanContextInterface['server']
  let newTxBuilder: SorobanContextInterface['newTxBuilder']
  if (!networkDetails.sorobanRpcUrl && networkDetails.network === NETWORKS.FUTURENET) {
    // TODO: after enough time has passed to assume most clients have ran
    // the migrateSorobanRpcUrlNetworkDetails migration, remove and use networkDetails.sorobanRpcUrl
    const serverUrl = !networkDetails.sorobanRpcUrl
      ? SOROBAN_RPC_URLS[NETWORKS.FUTURENET]
      : networkDetails.sorobanRpcUrl

    server = new SorobanClient.Server(serverUrl, {
      allowHttp: serverUrl.startsWith("http://"),
    });

    newTxBuilder = () =>
      new SorobanClient.TransactionBuilder(source, {
        fee,
        networkPassphrase: networkDetails.networkPassphrase,
      });
  } else if (networkDetails.sorobanRpcUrl) {
    server = new SorobanClient.Server(networkDetails.sorobanRpcUrl, {
      allowHttp: networkDetails.sorobanRpcUrl.startsWith("http://"),
    });

    newTxBuilder = () =>
      new SorobanClient.TransactionBuilder(source, {
        fee,
        networkPassphrase: networkDetails.networkPassphrase,
      });
  }
    
  return (
    <SorobanContext.Provider value={{ server, newTxBuilder }}>
      {children}
    </SorobanContext.Provider>
  );
};
