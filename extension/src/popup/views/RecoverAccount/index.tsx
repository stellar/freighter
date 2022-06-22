import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik, FieldProps } from "formik";
import { object as YupObject } from "yup";
import { Input, Checkbox, Select, TextLink } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { Onboarding } from "popup/components/Onboarding";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
  mnemonicPhrase as mnemonicPhraseValidator,
} from "popup/helpers/validators";
import {
  authErrorSelector,
  publicKeySelector,
  recoverAccount,
} from "popup/ducks/accountServices";
import { FormRows, SubmitButtonWrapper } from "popup/basics/Forms";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { PasswordRequirements } from "popup/components/PasswordRequirements";

import "./styles.scss";

export const RecoverAccount = () => {
  const publicKey = useSelector(publicKeySelector);
  const authError = useSelector(authErrorSelector);
  const publicKeyRef = useRef(publicKey);

  interface FormValues {
    password: string;
    confirmPassword: string;
    mnemonicPhrase: string;
    termsOfUse: boolean;
  }

  const initialValues: FormValues = {
    password: "",
    confirmPassword: "",
    mnemonicPhrase: "",
    termsOfUse: false,
  };

  const RecoverAccountSchema = YupObject().shape({
    mnemonicPhrase: mnemonicPhraseValidator,
    password: passwordValidator,
    confirmPassword: confirmPasswordValidator,
    termsOfUse: termsofUseValidator,
  });

  const dispatch = useDispatch();
  const MAX_PHRASE_LENGTH = 24;
  const [phraseLength, setPhraseLength] = useState(12);
  const [phraseInputs, setPhraseInputs] = useState([] as string[]);

  const handleSubmit = async (values: FormValues) => {
    const { password, mnemonicPhrase } = values;

    await dispatch(
      recoverAccount({
        password,
        mnemonicPhrase: mnemonicPhrase.trim(),
      }),
    );
  };

  useEffect(() => {
    if (publicKey && publicKey !== publicKeyRef.current) {
      navigateTo(ROUTES.recoverAccountSuccess);
    }
  }, [publicKey]);

  useEffect(() => {
    const phraseInputsArr = [];

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < MAX_PHRASE_LENGTH; i++) {
      phraseInputsArr.push(`MnemonicPhrase-${i}`);
    }
    setPhraseInputs(phraseInputsArr);
  }, []);

  // useEffect(() => {
  //   const phraseInputsCopy = [...phraseInputs];
  //   console.log(1);
  //   while (phraseInputsCopy.length < phraseLength) {
  //     phraseInputsCopy.push(`MnemonicPhrase-${phraseInputsCopy.length + 1}`);
  //   }

  //   while (phraseInputsCopy.length > phraseLength) {
  //     phraseInputsCopy.push(`MnemonicPhrase-${phraseInputsCopy.length + 1}`);
  //   }

  //   setPhraseInputs(phraseInputsCopy);
  // }, [phraseLength, phraseInputs]);

  console.log(phraseLength);

  return (
    <>
      <Header />
      <FullscreenStyle />
      <Onboarding hasGoBackBtn>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={RecoverAccountSchema}
        >
          {({ dirty, touched, isSubmitting, isValid, errors }) => (
            <Form>
              <div className="RecoverAccount__screen">
                <div className="RecoverAccount__half-screen">
                  <div className="RecoverAccount__header">
                    Import wallet from recovery phrase
                  </div>
                  <Select
                    onChange={(e) => setPhraseLength(Number(e.target.value))}
                    id="RecoverAccount__phrase-length-selector"
                  >
                    <option>12</option>
                    <option>24</option>
                  </Select>
                  <div className="RecoverAccount__mnemonic-input">
                    {/* <Field name="mnemonicPhrase">
                      {({ field }: FieldProps) => (
                        <Textarea
                          className="TextArea Card Card--highlight"
                          autoComplete="off"
                          id="mnemonic-input"
                          name="mnemonicPhrase"
                          placeholder="Enter your 12 word phrase to restore your wallet"
                          rows={5}
                          error={
                            authError ||
                            (errors.mnemonicPhrase && touched.mnemonicPhrase
                              ? authError || errors.mnemonicPhrase
                              : null)
                          }
                          customTextarea={<textarea {...field} />}
                        />
                      )}
                    </Field> */}

                    {phraseInputs.map((phraseInput, i) => (
                      <Field name={phraseInput}>
                        {({ field }: FieldProps) => (
                          <Input
                            autoComplete="off"
                            disabled={i > phraseLength}
                            id={phraseInput}
                            placeholder="Enter your 12 word phrase to restore your wallet"
                            error={
                              authError ||
                              (errors.mnemonicPhrase && touched.mnemonicPhrase
                                ? authError || errors.mnemonicPhrase
                                : null)
                            }
                            {...field}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </div>
                <div className="RecoverAccount__half-screen">
                  <FormRows>
                    <Input
                      autoComplete="off"
                      customInput={<Field />}
                      id="password-input"
                      name="password"
                      placeholder="New password"
                      type="password"
                      error={
                        errors.password && touched.password
                          ? errors.password
                          : ""
                      }
                    />
                    <Input
                      autoComplete="off"
                      customInput={<Field />}
                      id="confirm-password-input"
                      name="confirmPassword"
                      placeholder="Confirm password"
                      type="password"
                      error={
                        errors.confirmPassword && touched.confirmPassword
                          ? errors.confirmPassword
                          : null
                      }
                    />
                    <PasswordRequirements />
                    <Field name="termsOfUse">
                      {({ field }: FieldProps) => (
                        <Checkbox
                          autoComplete="off"
                          id="termsOfUse-input"
                          error={
                            errors.termsOfUse && touched.termsOfUse
                              ? errors.termsOfUse
                              : null
                          }
                          label={
                            <span>
                              I have read and agree to{" "}
                              <TextLink
                                variant={TextLink.variant.secondary}
                                href="https://stellar.org/terms-of-service"
                              >
                                Terms of Use
                              </TextLink>
                            </span>
                          }
                          {...field}
                        />
                      )}
                    </Field>
                  </FormRows>
                  <SubmitButtonWrapper>
                    <Button
                      fullWidth
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      IMPORT
                    </Button>
                  </SubmitButtonWrapper>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </Onboarding>
    </>
  );
};
