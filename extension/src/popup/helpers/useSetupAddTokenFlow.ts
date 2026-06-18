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
  assetCode: string;
  assetIssuer: string;
  uuid: string;
};

type Response = {
  isConfirming: boolean;
  isPasswordRequired: boolean;
  setIsPasswordRequired: (value: boolean) => void;
  verifyPasswordThenAddToken: (password: string) => Promise<void>;
  handleApprove: () => Promise<void>;
  rejectAndClose: () => void;
};

export const useSetupAddTokenFlow = ({
  rejectToken: rejectTokenFn,
  addToken: addTokenFn,
  assetCode: _assetCode,
  assetIssuer: _assetIssuer,
  uuid,
}: Params): Response => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);

  const dispatch: AppDispatch = useDispatch();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  const rejectAndClose = () => {
    emitMetric(METRIC_NAMES.tokenRejectApi);
    dispatch(rejectTokenFn({ uuid }));
    window.close();
  };

  const addTokenAndClose = async () => {
    try {
      await dispatch(addTokenFn({ uuid }));
      await emitMetric(METRIC_NAMES.tokenAddedApi);
    } catch (e) {
      console.error(e);
      await emitMetric(METRIC_NAMES.tokenFailedApi);
    }
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
};
