import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { startSep24Deposit } from "@shared/api/internal";
import { getAssetFromCanonical } from "helpers/stellar";
import { Loader } from "@stellar/design-system";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { AppDispatch } from "popup/App";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  sep24DataSelector,
  startHwSign,
  ShowOverlayStatus,
  transactionSubmissionSelector,
  storeSep24Data,
} from "popup/ducks/transactionSubmission";
import { openTab } from "popup/helpers/navigate";
import { Sep24Status } from "popup/constants/sep24";
import { addTrustline, getAnchorSep24Data } from "popup/helpers/sep24";

import "./styles.scss";

export const Sep24Todo = ({
  asset,
  todo,
  token,
}: {
  asset: string;
  todo: string;
  token: string;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const { sep10Url, sep24Url, anchorDomain } = useSelector(sep24DataSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { recommendedFee } = useNetworkFees();
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const [isLoading, setIsLoading] = useState(false);

  const { code, issuer } = getAssetFromCanonical(asset);

  const Message = ({
    title,
    actionCopy,
  }: {
    title: string;
    actionCopy: string;
  }) => (
    <>
      <div className="Sep24Todo__title">{title}</div>
      <div>{actionCopy}</div>
    </>
  );

  useEffect(() => {
    setIsLoading(false);
  }, [todo]);

  let message = null;
  let onClick = () => {};

  switch (todo) {
    case Sep24Status.INCOMPLETE:
      message = (
        <Message
          title="You have an unfinished deposit form"
          actionCopy="click here to finish"
        />
      );
      onClick = async () => {
        setIsLoading(true);
        const res = await startSep24Deposit({
          sep24Url,
          token,
          publicKey,
          code,
        });
        if (res.url) {
          openTab(res.url);
          dispatch(
            storeSep24Data({
              txId: res.id,
              sep10Url,
              sep24Url,
              publicKey,
              status: Sep24Status.INCOMPLETE,
              anchorDomain,
              asset,
            }),
          );
          window.location.reload();
        }
      };
      break;
    case Sep24Status.PENDING_TRUST:
      message = (
        <Message
          title="Trustline needed to finish deposit of SRT"
          actionCopy="click here to add trustline"
        />
      );

      onClick = async () => {
        setIsLoading(true);
        await addTrustline({
          dispatch,
          networkDetails,
          publicKey,
          code,
          issuer,
          fee: recommendedFee,
          isHardwareWallet,
        });
        if (!isHardwareWallet) {
          window.location.reload();
        }
      };
      break;
    case Sep24Status.PENDING_HARDWARE_WALLET_SIGN:
      message = (
        <Message
          title="You may have a pending deposit"
          actionCopy="click here to check"
        />
      );
      onClick = async () => {
        setIsLoading(true);
        const { challengeTx: transactionXDR } = await getAnchorSep24Data({
          anchorDomain,
          publicKey,
        });
        await dispatch(startHwSign({ transactionXDR, shouldSubmit: false }));
      };
      break;
    default:
  }

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && <LedgerSign />}
      {/* TODO - change to Button from SDS 2.0 */}
      <div
        className={`Sep24Todo ${isLoading ? "Sep24Todo__disabled" : ""}`}
        onClick={isLoading ? () => {} : onClick}
      >
        {isLoading ? (
          <div className="Sep24Todo__loader">
            <Loader />
          </div>
        ) : (
          message
        )}
      </div>
    </>
  );
};
