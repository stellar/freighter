import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik } from "formik";
import { Button, Icon, Link } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  saveDestinationAsset,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";
import { InfoTooltip } from "popup/basics/InfoTooltip";

enum PAYMENT_TYPES {
  REGULAR = "REGULAR",
  PATH_PAYMENT = "PATH_PAYMENT",
}

interface RadioCheckProps {
  name: string;
  title: string;
  subtext: string;
  tooltipDetails: React.ReactNode;
  value: string;
  selected: boolean;
}

const RadioCheck = ({
  name,
  title,
  subtext,
  tooltipDetails,
  value,
  selected,
}: RadioCheckProps) => (
  <div className="SendType__form-row">
    <label className="SendType--label SendType--radio-label">
      <div className="SendType__content-wrapper">
        <div className="SendType__content-wrapper__title">
          <InfoTooltip infoText={tooltipDetails} placement="bottom-start">
            {title}
          </InfoTooltip>
          {subtext && (
            <span className="SendType__content-wrapper__subtext">
              {subtext}
            </span>
          )}
        </div>
        <Field
          className="SendType--radio-field"
          name={name}
          type="radio"
          value={value}
        />
      </div>
    </label>
    <div
      className={`SendType--radio-check ${
        selected ? "SendType--radio-check--active" : ""
      }`}
    >
      <Icon.Check />
    </div>
  </div>
);

export const SendType = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { destinationAsset } = useSelector(transactionDataSelector);

  const submitForm = (values: { paymentType: string }) => {
    // path payment flag is a non empty string in redux destinationAsset
    dispatch(
      saveDestinationAsset(
        values.paymentType === PAYMENT_TYPES.PATH_PAYMENT ? "native" : "",
      ),
    );
    emitMetric(
      values.paymentType === PAYMENT_TYPES.PATH_PAYMENT
        ? METRIC_NAMES.sendPaymentTypePathPayment
        : METRIC_NAMES.sendPaymentTypePayment,
    );
    navigateTo(ROUTES.sendPaymentAmount);
  };

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Send Type")}
        customBackAction={() => navigateTo(ROUTES.sendPaymentAmount)}
        customBackIcon={<Icon.XClose />}
      />
      <Formik
        initialValues={{
          paymentType:
            destinationAsset === ""
              ? PAYMENT_TYPES.REGULAR
              : PAYMENT_TYPES.PATH_PAYMENT,
        }}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onSubmit={() => {}}
      >
        {({ values }) => (
          <>
            <View.Content>
              <Form>
                <RadioCheck
                  name="paymentType"
                  title={t("Same source and destination asset")}
                  value={PAYMENT_TYPES.REGULAR}
                  subtext="Most common"
                  tooltipDetails={
                    <span>
                      {t(
                        "The destination account receives the same asset and amount sent",
                      )}
                    </span>
                  }
                  selected={values.paymentType === PAYMENT_TYPES.REGULAR}
                />
                <RadioCheck
                  name="paymentType"
                  title={t("Different source and destination assets")}
                  value={PAYMENT_TYPES.PATH_PAYMENT}
                  subtext={t("Less common")}
                  tooltipDetails={
                    <span>
                      {t(
                        "The destination account can receive a different asset, the received amount is defined by the available conversion rates",
                      )}{" "}
                      <Link
                        variant="secondary"
                        href="https://www.ledger.com/stellar-wallet"
                        rel="noreferrer"
                        target="_blank"
                      >
                        {t("Learn more")}
                      </Link>
                    </span>
                  }
                  selected={values.paymentType === PAYMENT_TYPES.PATH_PAYMENT}
                />
              </Form>
            </View.Content>
            <View.Footer>
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                onClick={() => submitForm(values)}
              >
                {t("Done")}
              </Button>
            </View.Footer>
          </>
        )}
      </Formik>
    </React.Fragment>
  );
};
