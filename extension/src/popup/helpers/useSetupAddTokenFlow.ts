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

export function useSetupAddTokenFlow(
  reject: typeof rejectToken,
  addTokenFn: typeof addToken,
) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);

  const dispatch: AppDispatch = useDispatch();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  const rejectAndClose = () => {
    emitMetric(METRIC_NAMES.tokenRejectApi);
    dispatch(reject());
    window.close();
  };

  const addTokenAndClose = async () => {
    // Add trustline here

    await dispatch(addTokenFn());
    // TODO: test if it's called only after complete success
    await emitMetric(METRIC_NAMES.tokenAddedApi);
    window.close();
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
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    rejectAndClose,
  };
}
