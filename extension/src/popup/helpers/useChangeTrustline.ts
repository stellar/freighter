import { useDispatch, useSelector } from "react-redux";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { emitMetric } from "helpers/metrics";
import { getCanonicalFromAsset } from "helpers/stellar";

import { AppDispatch } from "popup/App";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  startHwSign,
} from "popup/ducks/transactionSubmission";

import { useNetworkFees } from "./useNetworkFees";

export const useChangeTrustline = ({
  assetCode,
  assetIssuer,
  recommendedFee: inputFee,
  setAssetSubmitting,
  setIsSigningWithHardwareWallet,
  setIsTrustlineErrorShowing,
  setRowButtonShowing,
}: {
  assetCode: string;
  assetIssuer: string;
  recommendedFee?: string;
  setAssetSubmitting?: (rowButtonShowing: string) => void;
  setIsSigningWithHardwareWallet?: (value: boolean) => void;
  setIsTrustlineErrorShowing?: (value: boolean) => void;
  setRowButtonShowing?: (value: string) => void;
}): {
  changeTrustline: (
    addTrustline: boolean,
    successfulCallback?: () => Promise<void>,
  ) => Promise<void>;
} => {
  const dispatch: AppDispatch = useDispatch();
  const walletType = useSelector(hardwareWalletTypeSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  const isHardwareWallet = !!walletType;

  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  const networkFees = useNetworkFees();
  const recommendedFee = inputFee || networkFees.recommendedFee;

  const canonicalAsset = getCanonicalFromAsset(assetCode, assetIssuer);

  const signAndSubmit = async (
    transactionXDR: string,
    trackChangeTrustline: () => void,
    successfulCallback?: () => Promise<void>,
  ) => {
    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      const submitResp = await dispatch(
        submitFreighterTransaction({
          publicKey,
          signedXDR: res.payload.signedTransaction,
          networkDetails,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          }),
        );
        trackChangeTrustline();
        dispatch(resetSubmission());
        if (successfulCallback) {
          await successfulCallback();
        }
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        setIsTrustlineErrorShowing?.(true);
      }

      setAssetSubmitting?.("");
      setRowButtonShowing?.("");
    }
  };

  const changeTrustline = async (
    addTrustline: boolean, // false removes the trustline
    successfulCallback?: () => Promise<void>,
  ) => {
    setAssetSubmitting?.(canonicalAsset);

    const transactionXDR: string = await getManageAssetXDR({
      publicKey,
      assetCode,
      assetIssuer,
      addTrustline,
      server,
      recommendedFee,
      networkDetails,
    });

    const trackChangeTrustline = () => {
      emitMetric(
        addTrustline
          ? METRIC_NAMES.manageAssetAddAsset
          : METRIC_NAMES.manageAssetRemoveAsset,
        { code: assetCode, issuer: assetIssuer },
      );
    };

    if (isHardwareWallet) {
      // eslint-disable-next-line
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      setIsSigningWithHardwareWallet?.(true);
      trackChangeTrustline();
    } else {
      await signAndSubmit(
        transactionXDR,
        trackChangeTrustline,
        successfulCallback,
      );
    }
  };

  return {
    changeTrustline,
  };
};
