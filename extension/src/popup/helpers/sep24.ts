import StellarSdk, { Account, StellarTomlResolver } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";

import { emitMetric } from "helpers/metrics";
import { xlmToStroop } from "helpers/stellar";
import { AppDispatch } from "popup/App";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { Sep24Status } from "popup/constants/sep24";
import {
  startHwSign,
  signFreighterTransaction,
  submitFreighterTransaction,
  storeSep24Status,
  clearSep24Data,
} from "popup/ducks/transactionSubmission";

export const getAuthToken = async ({
  signedXdr,
  sep10Url,
}: {
  signedXdr: string;
  sep10Url: string;
}) => {
  const authRes = await fetch(sep10Url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  const resJson = await authRes.json();
  return resJson.token;
};

export const getAnchorSep24Data = async ({
  anchorDomain,
  publicKey,
}: {
  anchorDomain: string;
  publicKey: string;
}) => {
  const tomlRes = await StellarTomlResolver.resolve(anchorDomain);
  const anchorSigningKey = tomlRes.SIGNING_KEY;

  const auth = await fetch(`${tomlRes.WEB_AUTH_ENDPOINT}?account=${publicKey}`);
  const authJson = await auth.json();
  const challengeTx = authJson.transaction;

  const { tx } = StellarSdk.Utils.readChallengeTx(
    challengeTx,
    anchorSigningKey,
    authJson.network_passphrase,
    anchorDomain,
    anchorDomain,
  );
  const transactionXDR = tx.toXDR();

  return {
    sep10Url: tomlRes.WEB_AUTH_ENDPOINT,
    sep24Url: tomlRes.TRANSFER_SERVER_SEP0024,
    challengeTx: transactionXDR,
    networkPassphrase: authJson.network_passphrase,
  };
};

export const startSep24Polling = async ({
  dispatch,
  sep24Url,
  txId,
  token,
  status,
}: {
  dispatch: AppDispatch;
  sep24Url: string;
  txId: string;
  token: string;
  status: string;
}) => {
  let currentStatus = status as Sep24Status;
  const endStatuses = [
    Sep24Status.INCOMPLETE,
    Sep24Status.PENDING_TRUST,
    Sep24Status.ERROR,
  ];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`${sep24Url}/transaction?id=${txId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // eslint-disable-next-line no-await-in-loop
    const txJson = await res.json();

    if (txJson.transaction.status === Sep24Status.COMPLETED) {
      dispatch(clearSep24Data());
      return Sep24Status.COMPLETED;
    }

    if (txJson.transaction.status !== currentStatus) {
      currentStatus = txJson.transaction.status;
      dispatch(storeSep24Status({ status: currentStatus }));
    }

    if (endStatuses.includes(currentStatus)) {
      return currentStatus;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

export const addTrustline = async ({
  dispatch,
  networkDetails,
  publicKey,
  code,
  issuer,
  fee,
  isHardwareWallet,
}: {
  dispatch: AppDispatch;
  networkDetails: NetworkDetails;
  publicKey: string;
  code: string;
  issuer: string;
  fee: string;
  isHardwareWallet: boolean;
}) => {
  const server = new StellarSdk.Server(networkDetails.networkUrl);
  const sourceAccount: Account = await server.loadAccount(publicKey);
  const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: xlmToStroop(fee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: new StellarSdk.Asset(code, issuer),
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();

  const trackAddTrustline = () => {
    emitMetric(METRIC_NAMES.manageAssetAddAsset, {
      code,
      issuer,
    });
  };

  if (isHardwareWallet) {
    await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
    trackAddTrustline();
  } else {
    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );
    if (signFreighterTransaction.fulfilled.match(res)) {
      const submitResp = await dispatch(
        submitFreighterTransaction({
          signedXDR: res.payload.signedTransaction,
          networkDetails,
        }),
      );
      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        trackAddTrustline();
      }
    }
  }
};
