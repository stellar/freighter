import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import { NETWORKS, SOROBAN_RPC_URLS } from "@shared/constants/stellar";

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
  const serverUrl = SOROBAN_RPC_URLS[networkDetails.network as NETWORKS];

  let server: SorobanContextInterface["server"];
  let newTxBuilder: SorobanContextInterface["newTxBuilder"];

  if (serverUrl) {
    server = new SorobanClient.Server(serverUrl, {
      allowHttp: networkDetails.networkUrl.startsWith("http://"),
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
