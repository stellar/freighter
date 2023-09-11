import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "popup/App";
import { signTransaction, rejectTransaction } from "popup/ducks/access";

import { Account } from "@shared/api/types";

import {
  allAccountsSelector,
  confirmPassword,
  hardwareWalletTypeSelector,
  hasPrivateKeySelector,
  makeAccountActive,
  publicKeySelector,
} from "popup/ducks/accountServices";

import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

export function useSetupSigningFlow(
  reject: typeof rejectTransaction,
  signFn: typeof signTransaction,
  transactionXdr: string,
  accountToSign?: string,
) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [startedHwSign, setStartedHwSign] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({} as Account);

  const dispatch: AppDispatch = useDispatch();
  const allAccounts = useSelector(allAccountsSelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const publicKey = useSelector(publicKeySelector);

  // the public key the user had selected before starting this flow
  const defaultPublicKey = useRef(publicKey);
  const allAccountsMap = useRef({} as { [key: string]: Account });
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const rejectAndClose = () => {
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

  useEffect(() => {
    // handle auto selecting the right account based on `accountToSign`
    let autoSelectedAccountDetails;

    allAccounts.forEach((account) => {
      if (accountToSign) {
        // does the user have the `accountToSign` somewhere in the accounts list?
        if (account.publicKey === accountToSign) {
          // if the `accountToSign` is found, but it isn't active, make it active
          if (defaultPublicKey.current !== account.publicKey) {
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
  }, [accountToSign, allAccounts, dispatch]);

  useEffect(() => {
    // handle any changes to the current acct - whether by auto select or manual select
    setCurrentAccount(allAccountsMap.current[publicKey] || ({} as Account));
  }, [allAccounts, publicKey]);

  return {
    allAccounts,
    accountNotFound,
    currentAccount,
    handleApprove,
    isHardwareWallet,
    publicKey,
    hwStatus,
    isConfirming,
    isPasswordRequired,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
  };
}
