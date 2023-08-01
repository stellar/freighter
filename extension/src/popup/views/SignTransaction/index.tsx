import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getTransactionInfo } from "helpers/stellar";
import { rejectTransaction, rejectBlob } from "popup/ducks/access";
import {
  allAccountsSelector,
  hasPrivateKeySelector,
  makeAccountActive,
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsExperimentalModeSelector,
} from "popup/ducks/settings";

import {
  ShowOverlayStatus,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

import { Account } from "@shared/api/types";
import { AppDispatch } from "popup/App";

import "./styles.scss";
import { SignBlobBody } from "./SignBlob";
import { SignTxBody } from "./SignTx";

export const SignTransaction = () => {
  const location = useLocation();
  const blobOrTx = getTransactionInfo(location.search);
  const isBlob = "blob" in blobOrTx;

  const dispatch: AppDispatch = useDispatch();
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const isExperimentalModeEnabled = useSelector(
    settingsExperimentalModeSelector,
  );

  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const [startedHwSign, setStartedHwSign] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({} as Account);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const allAccounts = useSelector(allAccountsSelector);
  const publicKey = useSelector(publicKeySelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  // the public key the user had selected before starting this flow
  const defaultPublicKey = useRef(publicKey);
  const allAccountsMap = useRef({} as { [key: string]: Account });
  const accountToSign = blobOrTx.accountToSign; // both types have this key

  const rejectAndClose = () => {
    const _reject = isBlob ? rejectTransaction : rejectBlob;
    dispatch(_reject());
    window.close();
  };

  const handleApprove = (signAndClose: () => Promise<void>) => async () => {
    setIsConfirming(true);

    if (hasPrivateKey) {
      await signAndClose();
    } else {
      setIsPasswordRequired(true);
    }

    setIsConfirming(false);
  };

  useEffect(() => {
    // handle any changes to the current acct - whether by auto select or manual select
    setCurrentAccount(allAccountsMap.current[publicKey] || ({} as Account));
  }, [allAccounts, publicKey]);

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

  if ("blob" in blobOrTx) {
    return (
      <SignBlobBody
        accountNotFound={accountNotFound}
        allAccounts={allAccounts}
        blob={blobOrTx}
        currentAccount={currentAccount}
        handleApprove={handleApprove}
        hwStatus={hwStatus}
        isConfirming={isConfirming}
        isDropdownOpen={isDropdownOpen}
        isExperimentalModeEnabled={isExperimentalModeEnabled}
        isHardwareWallet={isHardwareWallet}
        isPasswordRequired={isPasswordRequired}
        publicKey={publicKey}
        rejectAndClose={rejectAndClose}
        setIsDropdownOpen={setIsDropdownOpen}
        setIsPasswordRequired={setIsPasswordRequired}
        setStartedHwSign={setStartedHwSign}
      />
    );
  }

  return (
    <SignTxBody
      accountNotFound={accountNotFound}
      allAccounts={allAccounts}
      currentAccount={currentAccount}
      handleApprove={handleApprove}
      hwStatus={hwStatus}
      isConfirming={isConfirming}
      isDropdownOpen={isDropdownOpen}
      isExperimentalModeEnabled={isExperimentalModeEnabled}
      isHardwareWallet={isHardwareWallet}
      isPasswordRequired={isPasswordRequired}
      networkName={networkName}
      networkPassphrase={networkPassphrase}
      publicKey={publicKey}
      rejectAndClose={rejectAndClose}
      setAccountNotFound={setAccountNotFound}
      setCurrentAccount={setCurrentAccount}
      setIsDropdownOpen={setIsDropdownOpen}
      setIsPasswordRequired={setIsPasswordRequired}
      setStartedHwSign={setStartedHwSign}
      startedHwSign={startedHwSign}
      tx={blobOrTx}
    />
  );
};
