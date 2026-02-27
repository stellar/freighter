import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { Federation } from "stellar-sdk";

import { isValidStellarAddress, isFederationAddress } from "helpers/stellar";
import type { ContactsMap } from "popup/views/ContactBook";

import "./styles.scss";

interface EditContactCardProps {
  title: string;
  address?: string;
  name?: string;
  existingContacts: ContactsMap;
  onSave: (address: string, name: string, resolvedAddress?: string) => void;
  onCancel: () => void;
}

interface ContactFormValues {
  address: string;
  name: string;
}

export const EditContactCard = ({
  title: cardTitle,
  address: initialAddress = "",
  name: initialName = "",
  existingContacts,
  onSave,
  onCancel,
}: EditContactCardProps) => {
  const { t } = useTranslation();
  const resolvedAddressRef = React.useRef<string | undefined>(undefined);
  const hasAddressBlurred = React.useRef(false);
  const activeFieldRef = React.useRef<string | null>(null);
  const [isFetchingFederationAddress, setIsFetchingFederationAddress] =
    React.useState(false);

  const contactFormSchema = YupObject().shape({
    address: YupString()
      .required(t("Invalid Stellar address"))
      .test("is-valid-stellar-address", t("Invalid Stellar address"), (val) => {
        if (!val) return false;
        if (isFederationAddress(val)) {
          return true;
        }
        return isValidStellarAddress(val);
      })
      .test(
        "is-not-federation-failure",
        t("Failed to resolve federated address"),
        async (val) => {
          if (!val) return true;
          if (!isFederationAddress(val)) return true;
          if (
            !hasAddressBlurred.current ||
            activeFieldRef.current !== "address"
          )
            return true;
          setIsFetchingFederationAddress(true);
          try {
            const fedResp = await Federation.Server.resolve(val);
            resolvedAddressRef.current = fedResp.account_id;
            return true;
          } catch {
            resolvedAddressRef.current = undefined;
            return false;
          } finally {
            setIsFetchingFederationAddress(false);
          }
        },
      )
      .test(
        "is-not-duplicate-address",
        t("This address already exists in your contacts"),
        (val) => {
          if (!val) return true;
          return !Object.keys(existingContacts).some(
            (key) => key.toLowerCase() === val.toLowerCase(),
          );
        },
      ),
    name: YupString()
      .required(t("Name cannot be empty"))
      .trim()
      .test(
        "is-not-duplicate-name",
        t("This name already exists in your contacts"),
        (val) => {
          if (!val) return true;
          return !Object.values(existingContacts).some(
            (c) => c.name.toLowerCase() === val.trim().toLowerCase(),
          );
        },
      ),
  });

  const initialValues: ContactFormValues = {
    address: initialAddress,
    name: initialName,
  };

  const handleSubmit = (values: ContactFormValues) => {
    onSave(values.address, values.name.trim(), resolvedAddressRef.current);
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={contactFormSchema}
      onSubmit={handleSubmit}
    >
      {({
        errors,
        touched,
        isValid,
        isSubmitting,
        validateField,
        handleBlur,
        handleChange,
      }) => {
        return (
          <Form>
            <div className="EditContactCard">
              <div className="EditContactCard__content">
                <span className="EditContactCard__title">{cardTitle}</span>
                <div className="EditContactCard__fields">
                  <Input
                    type="text"
                    fieldSize="md"
                    autoComplete="off"
                    id="contact-address"
                    placeholder={t("Address")}
                    leftElement={<Icon.Wallet01 />}
                    error={
                      errors.address &&
                      touched.address &&
                      !isFetchingFederationAddress
                        ? errors.address
                        : ""
                    }
                    customInput={
                      <Field
                        onFocus={() => {
                          activeFieldRef.current = "address";
                        }}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          handleBlur(e);
                          if (isFederationAddress(e.target.value)) {
                            hasAddressBlurred.current = true;
                            validateField("address");
                          }
                        }}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange(e);
                          if (hasAddressBlurred.current) {
                            hasAddressBlurred.current = false;
                            resolvedAddressRef.current = undefined;
                          }
                        }}
                      />
                    }
                    name="address"
                  />
                  <Input
                    type="text"
                    fieldSize="md"
                    autoComplete="off"
                    id="contact-name"
                    placeholder={t("Name")}
                    leftElement={<Icon.User01 />}
                    error={errors.name && touched.name ? errors.name : ""}
                    customInput={
                      <Field
                        onFocus={() => {
                          activeFieldRef.current = "name";
                        }}
                      />
                    }
                    name="name"
                  />
                </div>
              </div>
              <div className="EditContactCard__actions">
                <Button
                  size="md"
                  isRounded
                  variant="tertiary"
                  type="button"
                  onClick={onCancel}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  size="md"
                  isRounded
                  variant="secondary"
                  type="submit"
                  disabled={!isValid || isSubmitting}
                >
                  {t("Save")}
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};
