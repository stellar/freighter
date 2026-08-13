import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon } from "@stellar/design-system";
import { Formik, Form } from "formik";

import { fundAccount } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { ROUTES } from "popup/constants/routes";
import { XLM_RESERVE_HELP_URL } from "popup/constants/externalLinks";
import { navigateTo } from "popup/helpers/navigate";
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

  const handleFundAccount = async () => {
    await dispatch(fundAccount({ publicKey }));
    await reloadBalances();
  };

  return (
    <div className="NotFunded" data-testid="not-funded">
      <div className="NotFunded__badge">
        <Icon.Coins01 />
      </div>
      <div className="NotFunded__title">{t("Looking a little empty...")}</div>
      <div className="NotFunded__body">
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
      </div>

      <Button
        variant="secondary"
        size="lg"
        isRounded
        onClick={() =>
          isMainnet(networkDetails)
            ? navigateTo(ROUTES.addFunds, navigate, "?isAddXlm=true")
            : navigateTo(ROUTES.viewPublicKey, navigate)
        }
      >
        {t("Add XLM")}
      </Button>

      {canUseFriendbot && (
        <Formik initialValues={{}} onSubmit={handleFundAccount}>
          {({ isSubmitting }) => (
            <Form>
              <Button
                variant="tertiary"
                size="md"
                isRounded
                isLoading={isSubmitting}
              >
                {t("Fund with Friendbot")}
              </Button>
            </Form>
          )}
        </Formik>
      )}
    </div>
  );
};
