import React from "react";
import { useDispatch } from "react-redux";
import { Formik, Form } from "formik";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { fundAccount } from "popup/ducks/accountServices";

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
    <>
      <div className="NotFunded" data-testid="not-funded">
        <div className="NotFunded__header">
          <Icon.InfoCircle />
          {t("Stellar address is not funded")}
        </div>
        <div className="NotFunded__copy">
          {t("To create this account, fund it with a minimum of 1 XLM.")}
          {canUseFriendbot ? (
            <span>
              {t(
                "You can fund this account using the friendbot tool. The friendbot is a horizon API endpoint that will fund an account with 10,000 lumens.",
              )}
            </span>
          ) : null}{" "}
          <a
            href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
            rel="noreferrer"
            target="_blank"
          >
            {t("Learn more about account creation")}
          </a>
        </div>
      </div>
      {canUseFriendbot ? (
        <Formik initialValues={{}} onSubmit={handleFundAccount}>
          {({ isSubmitting }) => (
            <Form className="NotFunded__form">
              <Button
                variant="primary"
                size="md"
                isFullWidth
                isLoading={isSubmitting}
                type="submit"
              >
                {t("Fund with Friendbot")}
              </Button>
            </Form>
          )}
        </Formik>
      ) : null}
    </>
  );
};
