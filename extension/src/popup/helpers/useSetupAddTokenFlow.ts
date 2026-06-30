import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { emitMetric } from "helpers/metrics";

import { AppDispatch } from "popup/App";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { rejectToken, addToken } from "popup/ducks/access";
import {
  confirmPassword,
  hasPrivateKeySelector,
} from "popup/ducks/accountServices";

type Params = {
  rejectToken: typeof rejectToken;
  addToken: typeof addToken;
  uuid: string;
};

type Response = {
  isConfirming: boolean;
  isPasswordRequired: boolean;
  isTokenAdded: boolean;
  submitError: string;
  clearSubmitError: () => void;
  setIsPasswordRequired: (value: boolean) => void;
  verifyPasswordThenAddToken: (password: string) => Promise<void>;
  handleApprove: () => Promise<void>;
  addTokenAndClose: () => Promise<boolean>;
  rejectAndClose: () => void;
};

export const useSetupAddTokenFlow = ({
  rejectToken: rejectTokenFn,
  addToken: addTokenFn,
  uuid,
}: Params): Response => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isTokenAdded, setIsTokenAdded] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const dispatch: AppDispatch = useDispatch();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  const rejectAndClose = () => {
    emitMetric(METRIC_NAMES.tokenRejectApi);
    dispatch(rejectTokenFn({ uuid }));
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
      "Failed to add token. Please retry or cancel."
    );
  };

  const addTokenAndClose = async () => {
    setIsTokenAdded(false);
    setSubmitError("");
    try {
      const addTokenResp = await dispatch(addTokenFn({ uuid }));
      const rejectedMessage = getThunkErrorMessage(addTokenResp);

      if (rejectedMessage) {
        await emitMetric(METRIC_NAMES.tokenFailedApi);
        setSubmitError(rejectedMessage);
        return false;
      }

      await emitMetric(METRIC_NAMES.tokenAddedApi);
      setIsTokenAdded(true);
    } catch (e) {
      console.error(e);
      await emitMetric(METRIC_NAMES.tokenFailedApi);
      setSubmitError("Failed to add token. Please retry or cancel.");
      return false;
    }

    return true;
  };

  const handleApprove = async () => {
    setIsConfirming(true);

    if (hasPrivateKey) {
      await addTokenAndClose();
    } else {
      setIsPasswordRequired(true);
    }

    setIsConfirming(false);
  };

  const verifyPasswordThenAddToken = async (password: string) => {
    const confirmPasswordResp = await dispatch(confirmPassword(password));

    if (confirmPassword.fulfilled.match(confirmPasswordResp)) {
      await addTokenAndClose();
    }
  };

  return {
    isConfirming,
    isPasswordRequired,
    isTokenAdded,
    submitError,
    clearSubmitError: () => setSubmitError(""),
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    addTokenAndClose,
    rejectAndClose,
  };
};
