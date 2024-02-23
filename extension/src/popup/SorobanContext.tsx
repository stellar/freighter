import React from "react";
import { useSelector } from "react-redux";
import { BASE_FEE, SorobanRpc, TransactionBuilder } from "stellar-sdk";

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
  const { sorobanRpcUrl = "" } = networkDetails;

  const server = new SorobanRpc.Server(sorobanRpcUrl, {
    allowHttp: sorobanRpcUrl.startsWith("http://"),
  });

  const newTxBuilder = async (fee = BASE_FEE) => {
    const sourceAccount = await server!.getAccount(pubKey);
    return new TransactionBuilder(sourceAccount, {
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
