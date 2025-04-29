import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "popup/App";
import { signTransaction, rejectTransaction } from "popup/ducks/access";

import { Account } from "@shared/api/types";

import {
  confirmPassword,
  hardwareWalletTypeSelector,
  hasPrivateKeySelector,
  makeAccountActive,
} from "popup/ducks/accountServices";

import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

export function useSetupSigningFlow(
  reject: typeof rejectTransaction,
  signFn: typeof signTransaction,
  transactionXdr: string,
) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [accountToSign, setAccountToSign] = useState<string | null>(null);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [startedHwSign, setStartedHwSign] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const dispatch: AppDispatch = useDispatch();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);

  const allAccountsMap = useRef({} as { [key: string]: Account });
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const rejectAndClose = () => {
    emitMetric(METRIC_NAMES.rejectSigning);
    dispatch(reject());
    window.close();
  };

  const signAndClose = async () => {
    if (isHardwareWallet) {
      dispatch(
        startHwSign({ transactionXDR: transactionXdr, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {
      await dispatch(signFn());
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

  const setAccountDetails = ({
    publicKey,
    allAccounts,
    accountToSign,
  }: {
    publicKey: string;
    allAccounts: Account[];
    accountToSign?: string;
  }) => {
    setPublicKey(publicKey);
    setAllAccounts(allAccounts);
    if (accountToSign) {
      setAccountToSign(accountToSign);
    }
  };

  useEffect(() => {
    if (startedHwSign && hwStatus === ShowOverlayStatus.IDLE) {
      window.close();
    }
  }, [startedHwSign, hwStatus]);

  useEffect(() => {
    // handle auto selecting the right account based on `accountToSign`
    let autoSelectedAccountDetails;

    allAccounts.forEach((account) => {
      if (accountToSign) {
        // does the user have the `accountToSign` somewhere in the accounts list?
        if (account.publicKey === accountToSign) {
          // if the `accountToSign` is found, but it isn't active, make it active
          if (publicKey !== account.publicKey) {
            dispatch(makeAccountActive(account.publicKey));
          }

          // save the details of the `accountToSign`
          autoSelectedAccountDetails = account;
        }
      }

      // create an object so we don't need to keep iterating over allAccounts when we switch accounts
      allAccountsMap.current[account.publicKey] = account;
    });

    if (!autoSelectedAccountDetails) {
      setAccountNotFound(true);
    }
  }, [accountToSign, allAccounts, dispatch, publicKey]);

  const currentAccount = useMemo(() => {
    return (
      allAccounts.find((a) => a.publicKey === publicKey) || ({} as Account)
    );
  }, [allAccounts, publicKey]);
  console.log(currentAccount);

  return {
    allAccounts,
    accountNotFound,
    currentAccount,
    handleApprove,
    isHardwareWallet,
    hwStatus,
    isConfirming,
    isPasswordRequired,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
    setAccountDetails,
  };
}
