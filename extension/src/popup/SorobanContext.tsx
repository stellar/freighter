import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import { SOROBAN_RPC_URLS } from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export const SorobanContext = React.createContext({} as SorobanTxBuilder);

class SorobanTxBuilder {
  public source: SorobanClient.Account;
  private fee: string;
  private networkPassphrase: string;
  public server: SorobanClient.Server;

  constructor(pubKey: string, fee: string, networkPassphrase: string) {
    this.source = new SorobanClient.Account(pubKey, "0");
    this.fee = fee;
    this.networkPassphrase = networkPassphrase;

    this.server = new SorobanClient.Server(SOROBAN_RPC_URLS.futureNet, {
      allowHttp: SOROBAN_RPC_URLS.futureNet.startsWith("http://"),
    });
  }

  newTxBuilder = () => {
    const builder = new SorobanClient.TransactionBuilder(this.source, {
      fee: this.fee,
      networkPassphrase: this.networkPassphrase,
    });

    return builder;
  };
}

export const SorobanProvider = ({
  children,
  pubKey,
}: {
  children: React.ReactNode;
  pubKey: string;
}) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  // fee doesn't matter, we're not submitting
  const TxBuilder = new SorobanTxBuilder(
    pubKey,
    "100",
    networkDetails.networkPassphrase,
  );

  return (
    <SorobanContext.Provider value={TxBuilder}>
      {children}
    </SorobanContext.Provider>
  );
};
