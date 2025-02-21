import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { Formik, Form, Field, FieldProps } from "formik";
import { object as YupObject, number as YupNumber } from "yup";
import { Input, Icon, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { FormRows } from "popup/basics/Forms";
import { InfoTooltip } from "popup/basics/InfoTooltip";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  saveTransactionTimeout,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";

export const SendSettingsTxTimeout = ({ previous }: { previous: ROUTES }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { transactionTimeout } = useSelector(transactionDataSelector);

  return (
    <React.Fragment>
      <SubviewHeader
        title="Transaction Timeout"
        customBackAction={() => navigateTo(previous, navigate)}
        customBackIcon={<Icon.XClose />}
        rightButton={
          <InfoTooltip
            infoText={
              <span>
                {t(
                  "Number of seconds that can pass before this transaction can no longer be accepted by the network",
                )}{" "}
              </span>
            }
            placement="bottom"
          >
            <></>
          </InfoTooltip>
        }
      />

      <Formik
        initialValues={{ transactionTimeout }}
        onSubmit={(values) => {
          dispatch(saveTransactionTimeout(values.transactionTimeout));
          navigateTo(previous, navigate);
        }}
        validationSchema={YupObject().shape({
          transactionTimeout: YupNumber().min(
            0,
            `${t("must be greater than")} 0`,
          ),
        })}
      >
        {({ values, isValid, errors }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content hasNoTopPadding>
              <FormRows>
                <Field name="transactionTimeout">
                  {({ field }: FieldProps) => (
                    <Input
                      label="Timeout in seconds"
                      fieldSize="md"
                      id="transaction-timeout-input"
                      className="SendTo__input"
                      type="number"
                      {...field}
                      error={errors.transactionTimeout}
                    />
                  )}
                </Field>
              </FormRows>
            </View.Content>
            <View.Footer>
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                disabled={!values.transactionTimeout || !isValid}
                type="submit"
              >
                {t("Done")}
              </Button>
            </View.Footer>
          </Form>
        )}
      </Formik>
    </React.Fragment>
  );
};
