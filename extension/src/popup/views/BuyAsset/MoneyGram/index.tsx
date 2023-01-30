import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { TextLink } from "@stellar/design-system";
import { startSep24Deposit } from "@shared/api/internal";

import { getCanonicalFromAsset } from "helpers/stellar";
import { getAuthToken, getAnchorSep24Data } from "popup/helpers/sep24";
import { Sep24Status } from "popup/constants/sep24";
import {
  signFreighterTransaction,
  startHwSign,
  ShowOverlayStatus,
  transactionSubmissionSelector,
  storeSep24Data,
} from "popup/ducks/transactionSubmission";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { AppDispatch } from "popup/App";
import { Button } from "popup/basics/buttons/Button";
import { SubviewHeader } from "popup/components/SubviewHeader";
import IconGreenCheck from "popup/assets/icon-green-check.svg";
import MoneyGramLogo from "popup/assets/moneygram-logo.svg";
import { openTab } from "popup/helpers/navigate";

import "./styles.scss";

// TODO - only can buy using test anchor for now
export const testAnchorDomain = "testanchor.stellar.org";
export const testAnchorCode = "SRT";
export const testAnchorIssuer =
  "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B";

export const MoneyGram = () => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [isLoading, setIsLoading] = useState(false);
  const {
    hardwareWalletData: { status: hwStatus, lastSignedXDR: hwSignedXDR },
  } = useSelector(transactionSubmissionSelector);
  const [freighterSignedXDR, setFreighterSignedXDR] = useState("");
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const [sep24Url, setSep24Url] = useState("");
  const [sep10Url, setSep10Url] = useState("");

  useEffect(() => {
    (async () => {
      const signedXdr = freighterSignedXDR || hwSignedXDR;
      if (signedXdr) {
        const token = await getAuthToken({ signedXdr, sep10Url });

        const res = await startSep24Deposit({
          sep24Url,
          token,
          publicKey,
          code: testAnchorCode,
        });
        if (res.id) {
          await dispatch(
            storeSep24Data({
              txId: res.id,
              sep10Url,
              sep24Url,
              publicKey,
              status: Sep24Status.INCOMPLETE,
              anchorDomain: testAnchorDomain,
              asset: getCanonicalFromAsset(testAnchorCode, testAnchorIssuer),
            }),
          );
          openTab(res.url);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwSignedXDR, freighterSignedXDR]);

  const handleContinue = async () => {
    setIsLoading(true);

    const {
      sep10Url: _sep10Url,
      sep24Url: _sep24Url,
      challengeTx,
    } = await getAnchorSep24Data({
      anchorDomain: testAnchorDomain,
      publicKey,
    });

    setSep10Url(_sep10Url);
    setSep24Url(_sep24Url);

    if (isHardwareWallet) {
      await dispatch(
        startHwSign({ transactionXDR: challengeTx, shouldSubmit: false }),
      );
    } else {
      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR: challengeTx,
          network: networkDetails.networkPassphrase,
        }),
      );
      if (signFreighterTransaction.fulfilled.match(res)) {
        setFreighterSignedXDR(res.payload.signedTransaction);
      }
    }
  };

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && <LedgerSign />}
      <div className="MoneyGram">
        <SubviewHeader title="" />
        <div className="MoneyGram__logo__caption">{t("Powered by")}</div>
        <div className="MoneyGram__logo">
          <img src={MoneyGramLogo} alt="moneygram logo" />
        </div>
        <div className="MoneyGram__title">
          {t("Buy with cash using MoneyGram")}
        </div>
        <div className="MoneyGram__bullet">
          <div className="MoneyGram__bullet__item">
            <img src={IconGreenCheck} alt="check" />
          </div>
          <div className="MoneyGram__bullet__item">
            {t("Create an order in Freighter")}
          </div>
        </div>
        <div className="MoneyGram__bullet">
          <div className="MoneyGram__bullet__item">
            <img src={IconGreenCheck} alt="check" />
          </div>
          <div className="MoneyGram__bullet__item">
            {t("Drop-off your cash at any participating Money Gram location")}
          </div>
        </div>
        <div className="MoneyGram__bullet">
          <div className="MoneyGram__bullet__item">
            <img src={IconGreenCheck} alt="check" />
          </div>
          <div className="MoneyGram__bullet__item">
            {t("USDC arrives instantly once drop-off is complete")}
          </div>
        </div>
        <div className="MoneyGram__bottom">
          <div className="MoneyGram__bottom__terms">
            {t("By continuing, you agree to MoneyGram’s")}
            <TextLink
              underline
              variant={TextLink.variant.secondary}
              // TODO - moneygram url
              href=""
              rel="noreferrer"
              target="_blank"
            >
              {t("Terms and Conditions.")}
            </TextLink>
          </div>
          <div className="MoneyGram__bottom__btn">
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              onClick={handleContinue}
              isLoading={isLoading}
            >
              {t("Continue to MoneyGram")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
