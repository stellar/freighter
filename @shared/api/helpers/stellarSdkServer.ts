import { FeeBumpTransaction, Horizon, Transaction } from "stellar-sdk";
import { Horizon as HorizonNext } from "stellar-sdk-next";

import { getSdk } from "@shared/helpers/stellar";

interface HorizonError {
  response: {
    status: number;
  };
}

const isHorizonError = (val: unknown): val is HorizonError =>
  typeof val === "object" &&
  val !== null &&
  "response" in val &&
  typeof val.response == "object" &&
  val.response !== null &&
  "status" in val.response;

export const getIsAllowHttp = (networkUrl: string) =>
  !networkUrl.includes("https");

export const stellarSdkServer = (
  networkUrl: string,
  networkPassphrase: string,
) => {
  const Sdk = getSdk(networkPassphrase);
  return new Sdk.Horizon.Server(networkUrl, {
    allowHttp: getIsAllowHttp(networkUrl),
  });
};

export const submitTx = async ({
  server,
  tx,
}: {
  server: Horizon.Server | HorizonNext.Server;
  tx: Transaction | FeeBumpTransaction;
}): Promise<any> => {
  let submittedTx;

  try {
    submittedTx = await server.submitTransaction(tx);
  } catch (e: unknown) {
    if (isHorizonError(e) && e.response.status === 504) {
      // in case of 504, keep retrying this tx until submission succeeds or we get a different error
      // https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/timeout
      // https://developers.stellar.org/docs/encyclopedia/error-handling
      return submitTx({ server, tx });
    }
    throw e;
  }

  return submittedTx;
};
