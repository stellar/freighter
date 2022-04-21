import React from "react";
import { useDispatch } from "react-redux";
import { Formik, Form } from "formik";
import { Icon } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { fundAccount } from "popup/ducks/accountServices";

import "./styles.scss";

export const NotFundedMessage = ({
  isTestnet,
  publicKey,
  setIsAccountFriendbotFunded,
}: {
  isTestnet: boolean;
  publicKey: string;
  setIsAccountFriendbotFunded: (isAccountFriendbotFunded: boolean) => void;
}) => {
  const dispatch = useDispatch();

  const handleFundAccount = async () => {
    await dispatch(fundAccount(publicKey));
    setIsAccountFriendbotFunded(true);
  };

  return (
    <>
      <div className="NotFunded">
        <div className="NotFunded__header">
          <Icon.Info />
          Stellar address is not funded
        </div>
        <div className="NotFunded__copy">
          To create this account, fund it with a minimum of 1 XLM.
          {isTestnet ? (
            <span>
              You can fund this account on the test network using the friendbot
              tool. The friendbot is a horizon API endpoint that will fund an
              account with 10,000 lumens on the test network.
            </span>
          ) : null}{" "}
          <a
            href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
            rel="noreferrer"
            target="_blank"
          >
            Learn more about account creation
          </a>
        </div>
      </div>
      {isTestnet ? (
        <Formik initialValues={{}} onSubmit={handleFundAccount}>
          {({ isSubmitting }) => (
            <Form className="NotFunded__form">
              <Button fullWidth isLoading={isSubmitting} type="submit">
                Fund with Friendbot
              </Button>
            </Form>
          )}
        </Formik>
      ) : null}
    </>
  );
};
