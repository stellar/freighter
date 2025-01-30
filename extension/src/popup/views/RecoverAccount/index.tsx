import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Form } from "formik";
import { object as YupObject } from "yup";
import {
  Card,
  Input,
  Icon,
  Button,
  Text,
  Toggle,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import {
  PasswordForm,
  initialValues,
  FormValues,
} from "popup/components/accountCreator/PasswordForm";
import {
  Onboarding,
  OnboardingError,
  OnboardingModal,
} from "popup/components/Onboarding";
import { View } from "popup/basics/layout/View";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import {
  authErrorSelector,
  publicKeySelector,
  recoverAccount,
} from "popup/ducks/accountServices";

import "./styles.scss";

interface PhraseInputProps {
  phraseInput: string;
  index: number;
  handleMnemonicInputChange: (value: string, index: number) => void;
  isTextShowing: boolean;
  isLongPhrase: boolean;
}

const PhraseInput = ({
  phraseInput,
  index,
  handleMnemonicInputChange,
  isTextShowing,
  isLongPhrase,
}: PhraseInputProps) => {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setInputValue("");
  }, [isLongPhrase]);

  return (
    <div key={phraseInput} className="RecoverAccount__phrase-input">
      <div className="RecoverAccount__phrase-input__number">
        {(index + 1).toString().padStart(2, "0")}
      </div>
      <Input
        fieldSize="md"
        autoComplete="off"
        id={phraseInput}
        name={phraseInput}
        onChange={(e) => {
          handleMnemonicInputChange(e.target.value, index);
          setInputValue(e.target.value);
        }}
        onPaste={(e) => e.preventDefault()}
        type={isTextShowing ? "text" : "password"}
        value={inputValue}
      />
    </div>
  );
};

const SHORT_PHRASE = 12;
const LONG_PHRASE = 24;

const buildMnemonicPhrase = (mnemonicPhraseArr: string[]) =>
  mnemonicPhraseArr.join(" ").trim();

export const RecoverAccount = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const authError = useSelector(authErrorSelector);
  const navigate = useNavigate();
  const publicKeyRef = useRef(publicKey);
  const RecoverAccountSchema = YupObject().shape({
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  const dispatch: AppDispatch = useDispatch();
  const [isLongPhrase, setIsLongPhrase] = useState(false);
  const [isTextShowing, setIsTextShowing] = useState(false);
  const [phraseInputs, setPhraseInputs] = useState([] as string[]);
  const [mnemonicPhraseArr, setMnemonicPhraseArr] = useState([] as string[]);
  const [password, setPassword] = useState("");

  const handleConfirm = (values: FormValues) => {
    setPassword(values.password);
  };

  const handleSubmit = async () => {
    await dispatch(
      recoverAccount({
        password,
        mnemonicPhrase: buildMnemonicPhrase(mnemonicPhraseArr),
      }),
    );
  };

  useEffect(() => {
    if (publicKey && publicKey !== publicKeyRef.current) {
      navigateTo(ROUTES.recoverAccountSuccess, navigate);
    }
  }, [publicKey]);

  useEffect(() => {
    const phraseInputsArr: string[] = [];
    let PHRASE_LENGTH = SHORT_PHRASE;

    // delay to account for css transition
    setTimeout(() => {
      PHRASE_LENGTH = isLongPhrase ? LONG_PHRASE : SHORT_PHRASE;

      // eslint-disable-next-line no-plusplus
      for (let i = 1; i <= PHRASE_LENGTH; i++) {
        phraseInputsArr.push(`MnemonicPhrase-${i}`);
      }
      setPhraseInputs(phraseInputsArr);

      if (PHRASE_LENGTH === SHORT_PHRASE) {
        // when going back to 12 words, clear all the fields
        setMnemonicPhraseArr([]);
      }
    }, 150);
  }, [isLongPhrase]);

  const handleMnemonicInputChange = (value: string, i: number) => {
    const arr = [...mnemonicPhraseArr];
    arr[i] = value;

    setMnemonicPhraseArr(arr);
  };

  return (
    <React.Fragment>
      <View.Content alignment="center" hasNoTopPadding hasNoBottomPadding>
        <Formik
          initialValues={initialValues}
          validationSchema={RecoverAccountSchema}
          onSubmit={handleSubmit}
        >
          {({ dirty, touched, isSubmitting, isValid, errors, values }) => (
            <>
              {password ? (
                <div className="RecoverAccount">
                  <Form>
                    <Onboarding layout="half">
                      <OnboardingModal
                        data-testid="confirm-mnemonic-phrase"
                        headerText="Import wallet from recovery phrase"
                        bodyText={
                          <>
                            <Text as="p" size="md">
                              {t(
                                "Enter your mnemonic phrase to restore your wallet",
                              )}
                            </Text>
                          </>
                        }
                      >
                        <Card variant="primary">
                          <div className="RecoverAccount__mnemonic-wrapper">
                            <div
                              className={`RecoverAccount__mnemonic-input ${
                                isLongPhrase
                                  ? "RecoverAccount__mnemonic-input--long-phrase"
                                  : ""
                              }`}
                            >
                              {phraseInputs.map((phraseInput, i) => (
                                <PhraseInput
                                  key={phraseInput}
                                  phraseInput={phraseInput}
                                  handleMnemonicInputChange={
                                    handleMnemonicInputChange
                                  }
                                  isTextShowing={isTextShowing}
                                  isLongPhrase={isLongPhrase}
                                  index={i}
                                />
                              ))}
                            </div>
                          </div>
                        </Card>
                        <div className="RecoverAccount__mnemonic-footer">
                          <div className="RecoverAccount__mnemonic-footer__row">
                            <div className="RecoverAccount__phrase-toggle">
                              <div>{SHORT_PHRASE} word</div>
                              <Toggle
                                fieldSize="md"
                                checked={isLongPhrase}
                                id="RecoverAccount__toggle"
                                onChange={() => setIsLongPhrase(!isLongPhrase)}
                              />
                              <div>{LONG_PHRASE} word</div>
                            </div>
                            <div className="RecoverAccount__mnemonic__text-toggle">
                              <Button
                                variant="tertiary"
                                onClick={() => setIsTextShowing(!isTextShowing)}
                                size="sm"
                                type="button"
                              >
                                <span> {isTextShowing ? "Hide" : "Show"}</span>
                                {isTextShowing ? <Icon.EyeOff /> : <Icon.Eye />}
                              </Button>
                            </div>
                          </div>

                          <div className="RecoverAccount__import">
                            <Button
                              variant="secondary"
                              size="lg"
                              type="submit"
                              isFullWidth
                              disabled={
                                !(
                                  dirty &&
                                  isValid &&
                                  buildMnemonicPhrase(mnemonicPhraseArr).length
                                )
                              }
                              isLoading={isSubmitting}
                            >
                              {t("Import")}
                            </Button>
                          </div>
                        </div>
                      </OnboardingModal>
                      <OnboardingError
                        errorString={
                          authError ? t("Invalid mnemonic phrase") : ""
                        }
                      />
                    </Onboarding>
                  </Form>
                </div>
              ) : (
                <PasswordForm
                  isValid={isValid}
                  dirty={dirty}
                  isSubmitting={isSubmitting}
                  errors={errors}
                  touched={touched}
                  values={values}
                  handleSubmit={handleConfirm}
                />
              )}
            </>
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
