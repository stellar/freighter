import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import { SOROBAN_RPC_URLS } from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export interface SorobanContextInterface {
  server: SorobanClient.Server;
  newTxBuilder: (fee?: string) => Promise<SorobanClient.TransactionBuilder>;
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
  const serverUrl = SOROBAN_RPC_URLS[networkDetails.network];

  const server = new SorobanClient.Server(serverUrl, {
    allowHttp: networkDetails.networkUrl.startsWith("http://"),
  });

  const newTxBuilder = async (fee = SorobanClient.BASE_FEE) => {
    const sourceAccount = await server.getAccount(pubKey);
    return new SorobanClient.TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: networkDetails.networkPassphrase,
    });
  };

  return (
    <SorobanContext.Provider value={{ server, newTxBuilder }}>
      {children}
    </SorobanContext.Provider>
  );
};
