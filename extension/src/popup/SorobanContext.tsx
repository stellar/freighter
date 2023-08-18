import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import {
  SOROBAN_RPC_URLS,
  FUTURENET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export interface SorobanContextInterface {
  server: SorobanClient.Server;
  newTxBuilder: (fee?: string) => SorobanClient.TransactionBuilder;
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
  const source = new SorobanClient.Account(pubKey, "0");

  const serverUrl =
    networkDetails.networkPassphrase ===
      "Test SDF Future Network ; October 2022" &&
    networkDetails.networkUrl === FUTURENET_NETWORK_DETAILS.networkUrl
      ? SOROBAN_RPC_URLS.FUTURENET
      : networkDetails.networkUrl;

  const server = new SorobanClient.Server(serverUrl, {
    allowHttp: networkDetails.networkUrl.startsWith("http://"),
  });

  const newTxBuilder = (fee = SorobanClient.BASE_FEE) =>
    new SorobanClient.TransactionBuilder(source, {
      fee,
      networkPassphrase: networkDetails.networkPassphrase,
    });

  return (
    <SorobanContext.Provider value={{ server, newTxBuilder }}>
      {children}
    </SorobanContext.Provider>
  );
};
