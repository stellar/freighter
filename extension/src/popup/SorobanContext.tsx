import React from "react";
import { useSelector } from "react-redux";
import * as SorobanClient from "soroban-client";

import { SOROBAN_RPC_URLS } from "@shared/constants/stellar";

import { settingsNetworkDetailsSelector } from "./ducks/settings";

export const SorobanContext = React.createContext({} as SorobanTxBuilder);

export class SorobanTxBuilder {
  public source: SorobanClient.Account;
  private fee: string;
  private pubKey: string;
  private networkPassphrase: string;
  public server: SorobanClient.Server;

  constructor(pubKey: string, fee: string, networkPassphrase: string) {
    this.fee = fee;
    this.pubKey = pubKey;
    this.networkPassphrase = networkPassphrase;

    this.server = new SorobanClient.Server(SOROBAN_RPC_URLS.futureNet, {
      allowHttp: SOROBAN_RPC_URLS.futureNet.startsWith("http://"),
    });
    this.source = new SorobanClient.Account(this.pubKey, "0");
  }

  setAccountSequence = async () => {
    const { sequence } = await this.server.getAccount(this.pubKey);
    this.source = new SorobanClient.Account(this.pubKey, sequence);
  };

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

  // Were only simluating so the fee here should not matter
  // AFAIK there is no fee stats for Soroban yet either
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
