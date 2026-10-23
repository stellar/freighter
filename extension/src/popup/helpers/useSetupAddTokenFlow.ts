import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { emitMetric } from "helpers/metrics";
import { getCanonicalFromAsset } from "helpers/stellar";
import { scrubStrKeys } from "helpers/stellarStrKey";

import { AppDispatch } from "popup/App";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { rejectToken, addToken } from "popup/ducks/access";
import {
  confirmPassword,
  hasPrivateKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { clearHiddenAssetFlag } from "popup/helpers/useHiddenAssets";

type Params = {
  rejectToken: typeof rejectToken;
  addToken: typeof addToken;
  uuid: string;
  // Threaded onto the add/reject dispatch so asset_add.responded carries
  // asset_code (analytics only — see ducks/access.ts). Empty when unknown.
  assetCode?: string;
  // The requested SEP-41 token's contract and the account adding it, so a
  // successful add can clear a hidden flag left on that token.
  contractId?: string;
  publicKey?: string;
};

type Response = {
  isConfirming: boolean;
  isPasswordRequired: boolean;
  submitError: string;
  clearSubmitError: () => void;
  setIsPasswordRequired: (value: boolean) => void;
  verifyPasswordThenAddToken: (password: string) => Promise<void>;
  handleApprove: () => Promise<void>;
  addTokenAndClose: (isTrustlineBacked?: boolean) => Promise<boolean>;
  rejectAndClose: () => void;
};

export const useSetupAddTokenFlow = ({
  rejectToken: rejectTokenFn,
  addToken: addTokenFn,
  uuid,
  assetCode,
  contractId,
  publicKey,
}: Params): Response => {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const dispatch: AppDispatch = useDispatch();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  // The token is added on the active network
  const { network } = useSelector(settingsNetworkDetailsSelector);

  const rejectAndClose = () => {
    emitMetric(METRIC_NAMES.assetAddApiCancelled);
    dispatch(rejectTokenFn({ uuid, assetCode }));
    window.close();
  };

  const getThunkErrorMessage = (action: unknown): string | null => {
    if (!action || typeof action !== "object") {
      return null;
    }

    const typedAction = action as {
      type?: string;
      error?: { message?: string };
      payload?: { error?: string; message?: string };
    };

    const isRejected = (typedAction.type || "").endsWith("/rejected");
    if (!isRejected) {
      return null;
    }

    return (
      typedAction.error?.message ||
      typedAction.payload?.error ||
      typedAction.payload?.message ||
      t("Failed to add token. Please retry or cancel.")
    );
  };

  // Resolves the dApp request but doesn't close the popup — the SAC review
  // needs to stay open for its own Success/Done screen. isTrustlineBacked
  // tells the background whether an on-chain trustline already succeeded,
  // so it doesn't have to re-derive that via a network call that could fail.
  const addTokenAndClose = async (isTrustlineBacked = false) => {
    setSubmitError("");
    try {
      const addTokenResp = await dispatch(
        addTokenFn({ uuid, isTrustlineBacked, assetCode }),
      );
      const rejectedMessage = getThunkErrorMessage(addTokenResp);

      if (rejectedMessage) {
        await emitMetric(METRIC_NAMES.assetAddApiFailed, {
          // Scrub Stellar StrKeys before this free-text reaches Amplitude.
          reason_code: scrubStrKeys(rejectedMessage) ?? rejectedMessage,
        });
        setSubmitError(rejectedMessage);
        return false;
      }

      await emitMetric(METRIC_NAMES.assetAddApiCompleted);
    } catch (e) {
      console.error(e);
      await emitMetric(METRIC_NAMES.assetAddApiFailed, {
        reason_code:
          e instanceof Error
            ? (scrubStrKeys(e.message) ?? e.message)
            : "unknown",
      });
      setSubmitError(t("Failed to add token. Please retry or cancel."));
      return false;
    }

    return true;
  };

  /**
   * Drops a stored hidden flag for the SEP-41 token just added, so it shows
   * up; see clearHiddenAssetFlag. Awaited before the popup closes, which
   * would drop a write still in flight. Never throws.
   */
  const clearAddedTokenHiddenFlag = async () => {
    if (!assetCode || !contractId || !publicKey) {
      return;
    }

    await clearHiddenAssetFlag({
      canonicalAsset: getCanonicalFromAsset(assetCode, contractId),
      activePublicKey: publicKey,
      network,
    });
  };

  // SEP-41 is a one-step flow: approve submits and closes immediately on
  // success (matching the pre-SAC-review behavior), with no separate Done
  // click. On failure the popup stays open so the user can retry or cancel.
  const handleApprove = async () => {
    setIsConfirming(true);

    if (hasPrivateKey) {
      if (await addTokenAndClose()) {
        await clearAddedTokenHiddenFlag();
        window.close();
      }
    } else {
      setIsPasswordRequired(true);
    }

    setIsConfirming(false);
  };

  const verifyPasswordThenAddToken = async (password: string) => {
    const confirmPasswordResp = await dispatch(confirmPassword(password));

    if (confirmPassword.fulfilled.match(confirmPasswordResp)) {
      if (await addTokenAndClose()) {
        await clearAddedTokenHiddenFlag();
        window.close();
      }
    }
  };

  return {
    isConfirming,
    isPasswordRequired,
    submitError,
    clearSubmitError: () => setSubmitError(""),
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    addTokenAndClose,
    rejectAndClose,
  };
};
