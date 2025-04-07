import React, { useEffect } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Textarea, Link, Button, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { useIsSwap } from "popup/helpers/useIsSwap";
import { isMuxedAccount } from "helpers/stellar";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";

import { InfoTooltip } from "popup/basics/InfoTooltip";

import { RequestState, State } from "constants/request";
import { TransactionData } from "types/transactions";
import { GetSettingsData } from "popup/views/SendPayment/hooks/useGetSettingsData";

import "../../styles.scss";

interface SettingsProps {
  goBack: () => void;
  goToNext: () => void;
  goToTimeoutSetting: () => void;
  goToFeeSetting: () => void;
  goToSlippageSetting: () => void;
  transactionData: TransactionData;
  settingsData: State<GetSettingsData, unknown>;
  fetchData: () => Promise<GetSettingsData | Error>;
  isPathPayment: boolean;
  setMemo: (memo: string | undefined) => void;
}

export const Settings = ({
  goBack,
  goToNext,
  goToTimeoutSetting,
  goToFeeSetting,
  goToSlippageSetting,
  transactionData,
  isPathPayment,
  setMemo,
  fetchData,
  settingsData,
}: SettingsProps) => {
  const { t } = useTranslation();
  const { destination, transactionTimeout, memo, allowedSlippage, isSoroswap } =
    transactionData;
  const isSwap = useIsSwap();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dont show memo for regular sends to Muxed, or for swaps
  const showMemo = !isSwap && !isMuxedAccount(destination);
  const showSlippage = (isPathPayment || isSwap) && !isSoroswap;
  const isLoading =
    settingsData.state === RequestState.IDLE ||
    settingsData.state === RequestState.LOADING;

  return (
    <React.Fragment>
      <SubviewHeader
        title={`${isSwap ? t("Swap") : t("Send")} ${t("Settings")}`}
        customBackAction={goBack}
      />
      {isLoading ? (
        <View.Content hasNoTopPadding>
          <div className="SendSettings__loadingWrapper">
            <Loader size="2rem" />
          </div>
        </View.Content>
      ) : (
        <Formik
          initialValues={{ memo }}
          onSubmit={(values) => {
            setMemo(values.memo);
          }}
        >
          {({ submitForm }) => (
            <Form className="View__contentAndFooterWrapper">
              <View.Content hasNoTopPadding>
                <FormRows>
                  <div className="SendSettings__row">
                    <div className="SendSettings__row__left">
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
                        <span
                          className="SendSettings__row__title SendSettings__clickable"
                          onClick={(e) => {
                            e.preventDefault();
                            submitForm();
                            goToFeeSetting();
                          }}
                        >
                          {t("Transaction fee")}
                        </span>
                      </InfoTooltip>
                    </div>
                    <div
                      className="SendSettings__row__right SendSettings__clickable"
                      onClick={(e) => {
                        e.preventDefault();
                        submitForm();
                        goToFeeSetting();
                      }}
                    >
                      <span data-testid="SendSettingsTransactionFee">
                        {settingsData.data?.recommendedFee} XLM
                      </span>
                      <div>
                        <Icon.ChevronRight />
                      </div>
                    </div>
                  </div>

                  <div className="SendSettings__row">
                    <div className="SendSettings__row__left">
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
                        <span
                          className="SendSettings__row__title SendSettings__clickable"
                          onClick={(e) => {
                            e.preventDefault();
                            submitForm();
                            goToTimeoutSetting();
                          }}
                        >
                          {t("Transaction timeout")}
                        </span>
                      </InfoTooltip>
                    </div>
                    <div
                      className="SendSettings__row__right SendSettings__clickable"
                      onClick={(e) => {
                        e.preventDefault();
                        submitForm();
                        goToTimeoutSetting();
                      }}
                    >
                      <span data-testid="SendSettingsTransactionTimeout">
                        {transactionTimeout}(s)
                      </span>
                      <div>
                        <Icon.ChevronRight />
                      </div>
                    </div>
                  </div>

                  {showSlippage && (
                    <div className="SendSettings__row">
                      <div className="SendSettings__row__left">
                        <InfoTooltip
                          infoText={
                            <span>
                              {t(
                                "Allowed downward variation in the destination amount",
                              )}{" "}
                              <Link
                                variant="secondary"
                                href="https://www.freighter.app/faq"
                                rel="noreferrer"
                                target="_blank"
                              >
                                {t("Learn more")}
                              </Link>
                            </span>
                          }
                          placement="bottom"
                        >
                          <span
                            className="SendSettings__row__title SendSettings__clickable"
                            onClick={(e) => {
                              e.preventDefault();
                              submitForm();
                              goToSlippageSetting();
                            }}
                          >
                            {t("Allowed slippage")}
                          </span>
                        </InfoTooltip>
                      </div>
                      <div
                        className="SendSettings__row__right SendSettings__clickable"
                        onClick={(e) => {
                          e.preventDefault();
                          submitForm();
                          goToSlippageSetting();
                        }}
                      >
                        <span data-testid="SendSettingsAllowedSlippage">
                          {allowedSlippage}%
                        </span>
                        <div>
                          <Icon.ChevronRight />
                        </div>
                      </div>
                    </div>
                  )}
                  {showMemo && (
                    <>
                      <div className="SendSettings__row">
                        <div className="SendSettings__row__left">
                          <InfoTooltip
                            infoText={
                              <span>
                                {t("Include a custom memo to this transaction")}{" "}
                                <Link
                                  variant="secondary"
                                  href="https://developers.stellar.org/docs/glossary/transactions/#memo"
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {t("Learn more")}
                                </Link>
                              </span>
                            }
                            placement="bottom"
                          >
                            <span className="SendSettings__row__title">
                              {t("Memo")}
                            </span>
                          </InfoTooltip>
                        </div>
                        <div className="SendSettings__row__right">
                          <span></span>
                        </div>
                      </div>
                      <Field name="memo">
                        {({ field }: FieldProps) => (
                          <Textarea
                            fieldSize="md"
                            id="mnemonic-input"
                            placeholder={t("Memo (optional)")}
                            {...field}
                          />
                        )}
                      </Field>
                    </>
                  )}
                </FormRows>
              </View.Content>
              <View.Footer>
                <Button
                  disabled={!settingsData.data?.recommendedFee}
                  size="md"
                  isFullWidth
                  type="submit"
                  variant="secondary"
                  data-testid="send-settings-btn-continue"
                  onClick={goToNext}
                >
                  {t("Review")} {isSwap ? t("Swap") : t("Send")}
                </Button>
              </View.Footer>
            </Form>
          )}
        </Formik>
      )}
    </React.Fragment>
  );
};
