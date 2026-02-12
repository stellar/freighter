import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AsyncThunk } from "@reduxjs/toolkit";

import { AppDispatch, AppState } from "popup/App";
import { rejectTransaction } from "popup/ducks/access";

import {
  confirmPassword,
  hardwareWalletTypeSelector,
  hasPrivateKeySelector,
} from "popup/ducks/accountServices";

import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

type AppThunk<Arg = void> = AsyncThunk<void, Arg, { state: AppState }>;

export function useSetupSigningFlow<Arg = void>(
  reject: typeof rejectTransaction,
  signFn: AppThunk<Arg>,
  transactionXdr: string,
  apiVersion?: string,
  uuid?: string,
) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [startedHwSign, setStartedHwSign] = useState(false);

  const dispatch: AppDispatch = useDispatch();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);

  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const rejectAndClose = () => {
    emitMetric(METRIC_NAMES.rejectSigning);
    dispatch(reject({ uuid }));
    window.close();
  };

  const signAndClose = async () => {
    if (isHardwareWallet) {
      dispatch(
        startHwSign({ transactionXDR: transactionXdr, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {
      await dispatch(signFn({ apiVersion, uuid } as Arg));
      await emitMetric(METRIC_NAMES.approveSign);
      window.close();
    }
  };

  const handleApprove = async () => {
    setIsConfirming(true);

    if (hasPrivateKey) {
      await signAndClose();
    } else {
      setIsPasswordRequired(true);
    }

    setIsConfirming(false);
  };

  const verifyPasswordThenSign = async (password: string) => {
    const confirmPasswordResp = await dispatch(confirmPassword(password));

    if (confirmPassword.fulfilled.match(confirmPasswordResp)) {
      await signAndClose();
    }
  };

  useEffect(() => {
    if (startedHwSign && hwStatus === ShowOverlayStatus.IDLE) {
      window.close();
    }
  }, [startedHwSign, hwStatus]);

  return {
    handleApprove,
    isHardwareWallet,
    hwStatus,
    isConfirming,
    isPasswordRequired,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  };
}
