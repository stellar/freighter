import React from "react";

import { Formik, Form, Field, FieldProps } from "formik";
import { object as YupObject, number as YupNumber } from "yup";
import { Input, Icon, Link, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { FormRows } from "popup/basics/Forms";
import { InfoTooltip } from "popup/basics/InfoTooltip";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

interface SendSettingsFee {
  goBack: () => void;
  transactionFee: string;
  setFee: (fee: string) => void;
}

export const SendSettingsFee = ({
  goBack,
  transactionFee,
  setFee,
}: SendSettingsFee) => {
  const { t } = useTranslation();
  const { networkCongestion, recommendedFee } = useNetworkFees();

  return (
    <React.Fragment>
      <SubviewHeader
        title="Transaction Fee"
        customBackAction={goBack}
        customBackIcon={<Icon.XClose />}
        rightButton={
          <InfoTooltip
            infoText={
              <span>
                {t("Maximum network transaction fee to be paid")}{" "}
                <Link
                  variant="secondary"
                  href="https://developers.stellar.org/docs/glossary/fees/#base-fee"
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("Learn more")}
                </Link>
              </span>
            }
            placement="bottom"
          >
            <></>
          </InfoTooltip>
        }
      />

      <Formik
        initialValues={{ transactionFee }}
        onSubmit={(values) => {
          setFee(String(values.transactionFee));
          goBack();
        }}
        validationSchema={YupObject().shape({
          transactionFee: YupNumber().min(
            0.00001,
            `${t("must be greater than")} 0.00001`,
          ),
        })}
      >
        {({ setFieldValue, values, isValid, errors }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content hasNoTopPadding>
              <FormRows>
                <Field name="transactionFee">
                  {({ field }: FieldProps) => (
                    <>
                      <Input
                        fieldSize="md"
                        id="transaction-fee-input"
                        className="SendTo__input"
                        type="number"
                        {...field}
                        error={errors.transactionFee}
                      />
                      <div className="TransactionFee__row">
                        {}
                        <Link
                          isUnderline
                          isDisabled={field.value === recommendedFee}
                          variant="secondary"
                          role="button"
                          onClick={() =>
                            setFieldValue("transactionFee", recommendedFee)
                          }
                        >
                          {t("Set recommended")}
                        </Link>
                        <span>
                          {networkCongestion} {t("congestion")}
                        </span>
                      </div>
                    </>
                  )}
                </Field>
              </FormRows>
            </View.Content>
            <View.Footer>
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                disabled={!values.transactionFee || !isValid}
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
