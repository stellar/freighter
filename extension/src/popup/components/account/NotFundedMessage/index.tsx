import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon } from "@stellar/design-system";
import { Formik, Form } from "formik";

import { fundAccount } from "popup/ducks/accountServices";
import { signFreighterTransaction } from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { ROUTES } from "popup/constants/routes";
import { XLM_RESERVE_HELP_URL } from "popup/constants/externalLinks";
import { navigateTo } from "popup/helpers/navigate";
import {
  createReserveClient,
  ReserveSendError,
  quoteAndBuildBootstrap,
  useReserveBootstrap,
} from "popup/helpers/reserve";
import { AppDispatch } from "popup/App";
import { isMainnet } from "helpers/stellar";

import "./styles.scss";

export const NotFundedMessage = ({
  canUseFriendbot,
  publicKey,
  reloadBalances,
}: {
  canUseFriendbot: boolean;
  publicKey: string;
  reloadBalances: () => Promise<unknown>;
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { options, isLoading } = useReserveBootstrap({
    publicKey,
    horizonUrl: networkDetails.networkUrl,
    networkPassphrase: networkDetails.networkPassphrase,
    enabled: Boolean(publicKey),
  });
  const [feeAsset, setFeeAsset] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.some((option) => option.asset === feeAsset)) return;
    setFeeAsset(options[0]?.asset ?? "");
  }, [feeAsset, options]);

  const selected = options.find((option) => option.asset === feeAsset);
  const locked = isActivating;

  const handleFundAccount = async () => {
    await dispatch(fundAccount({ publicKey }));
    await reloadBalances();
  };

  const handleActivate = async () => {
    if (!selected || locked) return;
    setIsActivating(true);
    setError(null);
    try {
      const built = await quoteAndBuildBootstrap({
        publicKey,
        option: selected,
        networkPassphrase: networkDetails.networkPassphrase,
      });
      const signed = await dispatch(
        signFreighterTransaction({
          transactionXDR: built.xdr,
          network: networkDetails.networkPassphrase,
        }),
      );
      if (signFreighterTransaction.rejected.match(signed)) {
        throw new Error(t("Could not sign the activation transaction."));
      }
      const client = createReserveClient(networkDetails.networkPassphrase);
      if (!client) {
        throw new Error(
          t("Could not activate this wallet with {{asset}}.", {
            asset: selected.code,
          }),
        );
      }
      await client.submit(built.quote, signed.payload.signedTransaction);
      await reloadBalances();
    } catch (e) {
      if (e instanceof ReserveSendError) {
        setError(t(e.i18nKey, e.i18nParams));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="NotFunded" data-testid="not-funded">
      <div className="NotFunded__badge">
        <Icon.Coins01 />
      </div>
      <div className="NotFunded__title">
        {selected
          ? t("You already have funds")
          : t("Looking a little empty...")}
      </div>
      <div className="NotFunded__body">
        {selected ? (
          <Trans
            i18nKey="This address already has <bold>{{asset}}</bold> waiting. Activate the wallet with that — reserves and the network fee come out of it. No XLM needed."
            values={{ asset: selected.code }}
            components={{ bold: <strong className="NotFunded__amount" /> }}
          />
        ) : (
          <>
            <Trans
              i18nKey="Add at least <bold>2 XLM</bold> to activate your wallet. Once funded, you'll be able to add tokens and make transactions."
              components={{ bold: <strong className="NotFunded__amount" /> }}
            />{" "}
            <a
              className="NotFunded__link"
              href={XLM_RESERVE_HELP_URL}
              rel="noreferrer"
              target="_blank"
            >
              {t("Learn more")}
            </a>
          </>
        )}
      </div>

      <div className="NotFunded__actions">
        {options.length > 1 ? (
          <label className="NotFunded__fee-label">
            {t("Activate with")}
            <select
              aria-label={t("Activation token")}
              data-testid="activate-fee-asset"
              className="NotFunded__fee-select"
              disabled={locked}
              value={feeAsset}
              onChange={(event) => setFeeAsset(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.asset} value={option.asset}>
                  {option.code}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {selected ? (
          <Button
            variant="secondary"
            size="lg"
            isRounded
            disabled={locked}
            isLoading={isActivating || isLoading}
            onClick={() => void handleActivate()}
            data-testid="activate-with-token"
          >
            {`${t("Activate with")} ${selected.code}`}
          </Button>
        ) : null}

        {/* Friendbot / Add XLM stay as the XLM path. The token button only
            appears when Reserve already has a claimable it will accept. */}
        {canUseFriendbot ? (
          <Formik initialValues={{}} onSubmit={handleFundAccount}>
            {({ isSubmitting }) => (
              <Form>
                <Button
                  variant="secondary"
                  size="lg"
                  isRounded
                  disabled={locked}
                  isLoading={isSubmitting}
                >
                  {t("Fund with Friendbot")}
                </Button>
              </Form>
            )}
          </Formik>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            isRounded
            disabled={locked}
            onClick={() =>
              isMainnet(networkDetails)
                ? navigateTo(ROUTES.addFunds, navigate, "?isAddXlm=true")
                : navigateTo(ROUTES.viewPublicKey, navigate)
            }
          >
            {t("Add XLM")}
          </Button>
        )}
      </div>

      {error ? (
        <p className="NotFunded__error" data-testid="activate-error">
          {error}
        </p>
      ) : null}
    </div>
  );
};
