import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, Form, Formik, FormikProps, useFormikContext } from "formik";

import { isFederationAddress } from "helpers/stellar";
import {
  createContactFormSchema,
  sanitizeName,
  NAME_MAX_LENGTH,
  FederationRefs,
} from "helpers/contactList";
import type { ContactsMap } from "popup/views/ContactBook";

import "./styles.scss";

interface EditContactCardProps {
  title: string;
  address?: string;
  name?: string;
  existingContacts: ContactsMap;
  onSave: (address: string, name: string, resolvedAddress?: string) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  onDirtyChange,
}: EditContactCardProps) => {
  const { t } = useTranslation();
  const [isFetchingFederationAddress, setIsFetchingFederationAddress] =
    React.useState(false);

  const refs: FederationRefs = {
    resolvedAddress: React.useRef<string | undefined>(undefined),
    lastResolvedInput: React.useRef<string | undefined>(undefined),
    federationFailed: React.useRef(false),
    hasAddressBlurred: React.useRef(false),
    activeField: React.useRef<string | null>(null),
    abortController: React.useRef<AbortController | null>(null),
    isMounted: React.useRef(true),
  };

  // Cleanup on unmount — cancel any in-flight federation request
  React.useEffect(() => {
    return () => {
      refs.isMounted.current = false;
      refs.abortController.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contactFormSchema = createContactFormSchema({
    t,
    existingContacts,
    refs,
    setIsFetchingFederationAddress,
  });

  const handleSubmit = (values: ContactFormValues) => {
    const trimmedAddress = values.address.trim();
    const sanitizedName = sanitizeName(values.name.trim());
    onSave(trimmedAddress, sanitizedName, refs.resolvedAddress.current);
  };

  const FormikDirtyObserver: React.FC<{
    onDirtyChange?: (dirty: boolean) => void;
  }> = ({ onDirtyChange }) => {
    const { dirty } = useFormikContext<ContactFormValues>();

    React.useEffect(() => {
      onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    return null;
  };

  return (
    <Formik
      initialValues={{ address: initialAddress, name: initialName }}
      validationSchema={contactFormSchema}
      validateOnMount
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
      }: FormikProps<ContactFormValues>) => {
        return (
          <Form>
            <FormikDirtyObserver onDirtyChange={onDirtyChange} />
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
                          refs.activeField.current = "address";
                        }}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          handleBlur(e);
                          if (isFederationAddress(e.target.value.trim())) {
                            refs.hasAddressBlurred.current = true;
                            validateField("address");
                          }
                        }}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange(e);
                          if (refs.hasAddressBlurred.current) {
                            refs.hasAddressBlurred.current = false;
                            refs.resolvedAddress.current = undefined;
                            refs.lastResolvedInput.current = undefined;
                            refs.federationFailed.current = false;
                            refs.abortController.current?.abort();
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
                    maxLength={NAME_MAX_LENGTH}
                    error={errors.name && touched.name ? errors.name : ""}
                    customInput={
                      <Field
                        onFocus={() => {
                          refs.activeField.current = "name";
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
