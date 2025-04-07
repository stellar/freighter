import React from "react";

import { Formik, Form, Field, FieldProps } from "formik";
import { object as YupObject, number as YupNumber } from "yup";
import { Input, Icon, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { FormRows } from "popup/basics/Forms";
import { InfoTooltip } from "popup/basics/InfoTooltip";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

interface SendSettingsTxTimeout {
  goBack: () => void;
  transactionTimeout: number;
  setTimeout: (timeout: number) => void;
}

export const SendSettingsTxTimeout = ({
  goBack,
  transactionTimeout,
  setTimeout,
}: SendSettingsTxTimeout) => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <SubviewHeader
        title="Transaction Timeout"
        customBackAction={goBack}
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
          setTimeout(values.transactionTimeout);
          goBack();
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
