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
      validateOnMount
      validateOnChange={false}
      validateOnBlur
    >
      {({ errors, touched, isValid, isSubmitting }) => {
        return (
          <Form>
            <div className="EditContactCard">
              <div className="EditContactCard__content">
                <span className="EditContactCard__title">{cardTitle}</span>
                <div className="EditContactCard__fields">
                  <Input
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
                    customInput={<Field />}
                    name="address"
                  />
                  <Input
                    fieldSize="md"
                    autoComplete="off"
                    id="contact-name"
                    placeholder={t("Name")}
                    leftElement={<Icon.User01 />}
                    error={errors.name && touched.name ? errors.name : ""}
                    customInput={<Field />}
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
