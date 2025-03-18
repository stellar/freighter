import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Notification } from "@stellar/design-system";
import { Formik, Form } from "formik";

import { fundAccount } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { AppDispatch } from "popup/App";
import { isMainnet } from "helpers/stellar";

import "./styles.scss";

export const NotFundedMessage = ({
  canUseFriendbot,
  publicKey,
  setIsAccountFriendbotFunded,
}: {
  canUseFriendbot: boolean;
  publicKey: string;
  setIsAccountFriendbotFunded: (isAccountFriendbotFunded: boolean) => void;
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const handleFundAccount = async () => {
    await dispatch(fundAccount(publicKey));
    setIsAccountFriendbotFunded(true);
  };

  return (
    <div className="NotFunded" data-testid="not-funded">
      <Notification
        variant="primary"
        title={t("To start using this account, fund it with at least 1 XLM.")}
      >
        <a
          className="NotFunded__link"
          href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
          rel="noreferrer"
          target="_blank"
        >
          {t("Learn more about account creation")}
        </a>
      </Notification>

      <div className="NotFunded__spacer" />

      <Button
        variant="secondary"
        size="md"
        isFullWidth
        onClick={() =>
          isMainnet(networkDetails)
            ? navigateTo(ROUTES.addFunds, navigate, "?isAddXlm=true")
            : navigateTo(ROUTES.viewPublicKey, navigate)
        }
      >
        {t("Add XLM")}
      </Button>

      <div className="NotFunded__spacer" />

      {canUseFriendbot && (
        <Formik initialValues={{}} onSubmit={handleFundAccount}>
          {({ isSubmitting }) => (
            <Form>
              <Button
                variant="primary"
                size="md"
                isFullWidth
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
