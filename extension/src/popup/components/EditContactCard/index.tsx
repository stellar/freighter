import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { Federation } from "stellar-sdk";

import { isValidStellarAddress, isFederationAddress } from "helpers/stellar";

import "./styles.scss";

interface Contact {
  address: string;
  name: string;
}

interface EditContactCardProps {
  title: string;
  address?: string;
  name?: string;
  existingContacts: Contact[];
  onSave: (address: string, name: string) => void;
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

  const contactFormSchema = YupObject().shape({
    address: YupString()
      .required(t("Invalid Stellar address"))
      .test("is-valid-stellar-address", t("Invalid Stellar address"), (val) => {
        if (!val) return false;
        if (isFederationAddress(val)) return true;
        return isValidStellarAddress(val);
      })
      .test(
        "is-not-federation-failure",
        t("Failed to resolve federated address"),
        async (val) => {
          if (!val) return true;
          if (!isFederationAddress(val)) return true;
          try {
            await Federation.Server.resolve(val);
            return true;
          } catch {
            return false;
          }
        },
      )
      .test(
        "is-not-duplicate-address",
        t("This address already exists in your contacts"),
        (val) => {
          if (!val) return true;
          return !existingContacts.some(
            (c) => c.address.toLowerCase() === val.toLowerCase(),
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
          return !existingContacts.some(
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
    onSave(values.address, values.name.trim());
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={contactFormSchema}
      onSubmit={handleSubmit}
      validateOnMount
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
                      errors.address && touched.address ? errors.address : ""
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
