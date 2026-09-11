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
type AppThunk<Arg = void> = AsyncThunk<void, Arg, { state: AppState }>;

// The only payload shape this hook ever dispatches to signFn. `url` (the dApp
// origin) rides along so the metrics handlers can attach `origin`.
interface SigningPayload {
  uuid: string;
  apiVersion?: string;
  url?: string;
}

export function useSetupSigningFlow(
  reject: typeof rejectTransaction,
  signFn: AppThunk<SigningPayload>,
  transactionXdr: string,
  uuid: string,
  apiVersion?: string,
  url?: string,
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

  // Approval/rejection telemetry is emitted per signing type (signing.transaction_*,
  // signing.message_*, signing.auth_entry_*) — so no generic event fires here.
  // Which component emits depends on the branch signAndClose() takes below:
  //   - software keys: the redux handlers in popup/metrics/access.ts, keyed off
  //     the specific sign/reject thunk this flow dispatches.
  //   - hardware keys: the HardwareSign overlay, since startHwSign bypasses the
  //     sign thunk entirely and those handlers would never fire.
  // Both paths emit through popup/metrics/signing so the schemas stay identical.
  // Rejection is shared: rejectAndClose dispatches the reject thunk for both
  // key types, so the *_rejected events come from access.ts either way.
  const rejectAndClose = () => {
    dispatch(reject({ uuid, url }));
    window.close();
  };

  const signAndClose = async () => {
    if (isHardwareWallet) {
      dispatch(
        startHwSign({ transactionXDR: transactionXdr, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {
      await dispatch(signFn({ apiVersion, uuid, url }));
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
