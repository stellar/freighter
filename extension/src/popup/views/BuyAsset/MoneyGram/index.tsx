import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { TextLink } from "@stellar/design-system";
import StellarSdk, { Account, StellarTomlResolver } from "stellar-sdk";

import { xlmToStroop } from "helpers/stellar";
import { emitMetric } from "helpers/metrics";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
  startHwSign,
  ShowOverlayStatus,
  transactionSubmissionSelector,
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
import { openTab, navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { Sep24Status } from "popup/constants/sep24";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import "./styles.scss";

// TODO - only can buy using test anchor for now
const testAnchorDomain = "testanchor.stellar.org";
const testAnchorCode = "SRT";
const testAnchorIssuer =
  "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B";

export const MoneyGram = () => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [isLoading, setIsLoading] = useState(false);
  const { recommendedFee } = useNetworkFees();
  const {
    hardwareWalletData: { status: hwStatus, lastSignedXDR: hwSignedXDR },
  } = useSelector(transactionSubmissionSelector);
  const [freighterSignedXDR, setFreighterSignedXDR] = useState("");
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const [sep24Url, setSep24Url] = useState("");
  const [authEndpoint, setAuthEndpoint] = useState("");

  useEffect(() => {
    (async () => {
      const signedXdr = freighterSignedXDR || hwSignedXDR;
      if (signedXdr) {
        const token = await getAuthToken(signedXdr);
        startSep24Deposit(token);
      }
    })();
    // ALEC TODO - safe?
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwSignedXDR, freighterSignedXDR]);

  const getAuthToken = async (signedXdr: string) => {
    const authRes = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: signedXdr }),
    });
    const resJson = await authRes.json();
    return resJson.token;
  };

  const handleContinue = async () => {
    setIsLoading(true);
    const tomlRes = await StellarTomlResolver.resolve(testAnchorDomain);
    setAuthEndpoint(tomlRes.WEB_AUTH_ENDPOINT);
    const anchorSigningKey = tomlRes.SIGNING_KEY;
    setSep24Url(tomlRes.TRANSFER_SERVER_SEP0024);

    const auth = await fetch(
      `${tomlRes.WEB_AUTH_ENDPOINT}?account=${publicKey}`,
    );
    const authJson = await auth.json();
    const challengeTx = authJson.transaction;

    const { tx } = StellarSdk.Utils.readChallengeTx(
      challengeTx,
      anchorSigningKey,
      authJson.network_passphrase,
      testAnchorDomain,
      testAnchorDomain,
    );
    const transactionXDR = tx.toXDR();

    if (isHardwareWallet) {
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: false }));
    } else {
      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR,
          network: networkDetails.networkPassphrase,
        }),
      );
      if (signFreighterTransaction.fulfilled.match(res)) {
        setFreighterSignedXDR(res.payload.signedTransaction);
      }
    }
  };

  const startSep24Deposit = async (token: string) => {
    const response = await fetch(
      `${sep24Url}/transactions/deposit/interactive`,
      {
        method: "POST",
        body: JSON.stringify({
          asset_code: "SRT",
          account: publicKey,
          lang: "en",
          claimable_balance_supported: false,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const j = await response.json();

    // ALEC TODO - remove
    console.log({ j });

    // TODO - when polling starts will have to change,
    // since the extension closes on new tab
    openTab(j.url);
    startPolling(j.id, token);
  };

  const startPolling = async (transactionId: string, token: string) => {
    let currentStatus = Sep24Status.INCOMPLETE;
    const endStatuses = [
      Sep24Status.PENDING_EXTERNAL,
      Sep24Status.COMPLETED,
      Sep24Status.ERROR,
    ];
    while (!endStatuses.includes(currentStatus)) {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${sep24Url}/transaction?id=${transactionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // eslint-disable-next-line no-await-in-loop
      const txJson = await res.json();

      // ALEC TODO - remove
      console.log(txJson);
      console.log(txJson.transaction.status);

      if (txJson.transaction.status !== currentStatus) {
        currentStatus = txJson.transaction.status;

        if (currentStatus === Sep24Status.PENDING_TRUST) {
          // eslint-disable-next-line no-await-in-loop
          await addTrustline();
        }

        if (currentStatus === Sep24Status.COMPLETED) {
          navigateTo(ROUTES.account);
          break;
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  const addTrustline = async () => {
    const server = new StellarSdk.Server(networkDetails.networkUrl);
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(testAnchorCode, testAnchorIssuer),
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

    const trackAddTrustline = () => {
      emitMetric(METRIC_NAMES.manageAssetAddAsset, {
        testAnchorCode,
        testAnchorIssuer,
      });
    };

    if (isHardwareWallet) {
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      trackAddTrustline();
    } else {
      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR,
          network: networkDetails.networkPassphrase,
        }),
      );
      if (signFreighterTransaction.fulfilled.match(res)) {
        const submitResp = await dispatch(
          submitFreighterTransaction({
            signedXDR: res.payload.signedTransaction,
            networkDetails,
          }),
        );
        if (submitFreighterTransaction.fulfilled.match(submitResp)) {
          trackAddTrustline();
        }
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
