import { FeeBumpTransaction, Horizon, Transaction } from "stellar-sdk";

export const getIsAllowHttp = (networkUrl: string) =>
  !networkUrl.includes("https");

export const stellarSdkServer = (networkUrl: string) =>
  new Horizon.Server(networkUrl, {
    allowHttp: getIsAllowHttp(networkUrl),
  });

export const submitTx = async ({
  server,
  tx,
}: {
  server: Horizon.Server;
  tx: Transaction | FeeBumpTransaction;
}): Promise<any> => {
  let submittedTx;

  try {
    submittedTx = await server.submitTransaction(tx);
  } catch (e) {
    if (e.response.status === 504) {
      // in case of 504, keep retrying this tx until submission succeeds or we get a different error
      // https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/timeout
      // https://developers.stellar.org/docs/encyclopedia/error-handling
      return submitTx({ server, tx });
    }
    throw e;
  }

  return submittedTx;
};
