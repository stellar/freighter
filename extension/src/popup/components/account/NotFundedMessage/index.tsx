import { Button, Notification } from "@stellar/design-system";
import { Formik, Form } from "formik";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";

import { fundAccount } from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

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
  const dispatch = useDispatch();

  const handleFundAccount = async () => {
    // eslint-disable-next-line
    await dispatch(fundAccount(publicKey));
    setIsAccountFriendbotFunded(true);
  };

  return (
    <div className="NotFunded" data-testid="not-funded">
      <Notification
        variant="primary"
        title={t("To start using this account, fund it with at least 1 XLM.")}
      />

      <div className="NotFunded__spacer" />

      <Button
        variant="secondary"
        size="md"
        isFullWidth
        onClick={() => navigateTo(ROUTES.viewPublicKey)}
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
