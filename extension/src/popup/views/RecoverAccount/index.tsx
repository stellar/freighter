import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik, FieldProps } from "formik";
import { object as YupObject } from "yup";
import {
  Input,
  Checkbox,
  Icon,
  Link,
  Button,
  Toggle,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  Onboarding,
  OnboardingButtons,
  OnboardingHeader,
  OnboardingOneCol,
  OnboardingTwoCol,
} from "popup/components/Onboarding";
import { FormError, FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

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
        placeholder={`${index + 1}.`}
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
  interface FormValues {
    password: string;
    confirmPassword: string;
    termsOfUse: boolean;
  }

  const initialValues: FormValues = {
    password: "",
    confirmPassword: "",
    termsOfUse: false,
  };

  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const authError = useSelector(authErrorSelector);
  const publicKeyRef = useRef(publicKey);
  const RecoverAccountSchema = YupObject().shape({
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  const dispatch = useDispatch();
  const [isLongPhrase, setIsLongPhrase] = useState(false);
  const [isTextShowing, setIsTextShowing] = useState(false);
  const [phraseInputs, setPhraseInputs] = useState([] as string[]);
  const [mnemonicPhraseArr, setMnemonicPhraseArr] = useState([] as string[]);

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;

    // eslint-disable-next-line
    await dispatch(
      recoverAccount({
        password,
        mnemonicPhrase: buildMnemonicPhrase(mnemonicPhraseArr),
      }),
    );
  };

  useEffect(() => {
    if (publicKey && publicKey !== publicKeyRef.current) {
      navigateTo(ROUTES.recoverAccountSuccess);
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
      <View.Header />
      <View.Content alignment="center">
        <Formik
          initialValues={initialValues}
          validationSchema={RecoverAccountSchema}
          onSubmit={handleSubmit}
        >
          {({ dirty, touched, isSubmitting, isValid, errors }) => (
            <Onboarding layout="full">
              <Form>
                <OnboardingOneCol>
                  <OnboardingHeader>
                    {t("Import wallet from recovery phrase")}
                  </OnboardingHeader>
                  <div className="RecoverAccount__subheader">
                    {t("Enter your 12 word phrase to restore your wallet")}
                  </div>
                </OnboardingOneCol>

                <OnboardingTwoCol>
                  <OnboardingOneCol>
                    <div>
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
                      {authError ? <FormError>{authError}</FormError> : <></>}
                      <div className="RecoverAccount__mnemonic-footer">
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
                            variant="secondary"
                            onClick={() => setIsTextShowing(!isTextShowing)}
                            size="sm"
                            type="button"
                          >
                            <span> {isTextShowing ? "Hide" : "Show"}</span>
                            {isTextShowing ? <Icon.EyeOff /> : <Icon.Eye />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </OnboardingOneCol>

                  <OnboardingOneCol>
                    <FormRows>
                      <Input
                        fieldSize="md"
                        autoComplete="off"
                        customInput={<Field />}
                        id="password-input"
                        name="password"
                        placeholder={t("New password")}
                        type="password"
                        error={
                          errors.password && touched.password
                            ? errors.password
                            : ""
                        }
                      />
                      <Input
                        fieldSize="md"
                        autoComplete="off"
                        customInput={<Field />}
                        id="confirm-password-input"
                        name="confirmPassword"
                        placeholder={t("Confirm password")}
                        type="password"
                        error={
                          errors.confirmPassword && touched.confirmPassword
                            ? errors.confirmPassword
                            : null
                        }
                      />
                      <PasswordRequirements />
                    </FormRows>

                    <Field name="termsOfUse">
                      {({ field, form }: FieldProps) => (
                        <Checkbox
                          fieldSize="md"
                          autoComplete="off"
                          id="termsOfUse-input"
                          error={
                            errors.termsOfUse && touched.termsOfUse
                              ? errors.termsOfUse
                              : null
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              form.setFieldValue("termsOfUse", !field.value);
                              e.currentTarget.checked = !field.value;
                            }
                          }}
                          label={
                            <>
                              {t("I have read and agree to the")}{" "}
                              <Link
                                variant="primary"
                                href="https://stellar.org/terms-of-service"
                              >
                                {t("Terms of Use")}
                              </Link>
                            </>
                          }
                          {...field}
                        />
                      )}
                    </Field>

                    <OnboardingButtons hasGoBackBtn>
                      <Button
                        size="md"
                        variant="tertiary"
                        isLoading={isSubmitting}
                        disabled={
                          !(
                            dirty &&
                            isValid &&
                            buildMnemonicPhrase(mnemonicPhraseArr).length
                          )
                        }
                      >
                        {t("Import")}
                      </Button>
                    </OnboardingButtons>
                  </OnboardingOneCol>
                </OnboardingTwoCol>
              </Form>
            </Onboarding>
          )}
        </Formik>
      </View.Content>
    </React.Fragment>
  );
};
