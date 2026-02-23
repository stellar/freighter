import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Input } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { Federation } from "stellar-sdk";
import { toast } from "sonner";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  isValidStellarAddress,
  isFederationAddress,
  truncatedPublicKey,
} from "helpers/stellar";

import "./styles.scss";

interface Contact {
  address: string;
  name: string;
}

// const INITIAL_CONTACTS: Contact[] = [
//   {
//     address: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
//     name: "Piyal",
//   },
//   {
//     address: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
//     name: "Cassio",
//   },
// ];

type CardMode = { type: "add" } | { type: "edit"; contact: Contact };

export const ContactBook = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cardMode, setCardMode] = useState<CardMode | null>(null);
  const [openMenuAddress, setOpenMenuAddress] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAddContact = useCallback(() => {
    setCardMode({ type: "add" });
  }, []);

  const handleEditContact = useCallback((contact: Contact) => {
    setCardMode({ type: "edit", contact });
    setOpenMenuAddress(null);
  }, []);

  const handleCopyAddress = useCallback(
    async (address: string) => {
      await navigator.clipboard.writeText(address);
      toast.success(t("Address copied"));
      setOpenMenuAddress(null);
    },
    [t],
  );

  const handleDeleteContact = useCallback(
    (contact: Contact) => {
      setContacts((prev) => prev.filter((c) => c.address !== contact.address));
      toast.success(t("Contact successfully deleted"));
      setOpenMenuAddress(null);
    },
    [t],
  );

  const handleSaveContact = useCallback(
    (address: string, name: string) => {
      if (cardMode?.type === "edit") {
        setContacts((prev) =>
          prev.map((c) =>
            c.address === cardMode.contact.address ? { address, name } : c,
          ),
        );
      } else if (cardMode?.type === "add") {
        setContacts((prev) => [...prev, { address, name }]);
        toast.success(t("Contact successfully added"));
      }
      setCardMode(null);
    },
    [cardMode, t],
  );

  const handleDismissCard = useCallback(() => {
    setCardMode(null);
  }, []);

  const toggleMenu = useCallback((address: string) => {
    setOpenMenuAddress((prev) => (prev === address ? null : address));
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuAddress(null);
      }
    };

    if (openMenuAddress) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuAddress]);

  const cardTitle =
    cardMode?.type === "edit" ? t("Edit a Contact") : t("Add a Contact");

  const existingContacts =
    cardMode?.type === "edit"
      ? contacts.filter((c) => c.address !== cardMode.contact.address)
      : contacts;

  return (
    <>
      <SubviewHeader
        title={t("Contact Book")}
        customBackIcon={<Icon.X />}
        rightButton={
          <button
            className="ContactBook__add-button"
            onClick={handleAddContact}
          >
            <Icon.Plus />
          </button>
        }
      />
      <View.Content hasNoTopPadding>
        {contacts.length === 0 ? (
          <div className="ContactBook__empty">
            <Icon.Users01 className="ContactBook__empty__icon" />
            <span className="ContactBook__empty__text">
              {t(
                "Contacts are wallets you recognize, helpful for recurring or trusted sends.",
              )}
            </span>
            <button
              className="ContactBook__empty__add-btn"
              onClick={handleAddContact}
            >
              {t("Add a Contact")}
            </button>
          </div>
        ) : (
          <div className="ContactBook__list">
            {contacts.map((contact) => (
              <div key={contact.address} className="ContactBook__row">
                <div className="ContactBook__row__info">
                  <div className="ContactBook__row__identicon">
                    <IdenticonImg publicKey={contact.address} />
                  </div>
                  <div className="ContactBook__row__details">
                    <span className="ContactBook__row__name">
                      {contact.name}
                    </span>
                    <span className="ContactBook__row__address">
                      {truncatedPublicKey(contact.address)}
                    </span>
                  </div>
                </div>
                <div
                  className="ContactBook__row__menu-wrapper"
                  ref={openMenuAddress === contact.address ? menuRef : null}
                >
                  <button
                    className="ContactBook__row__menu-trigger"
                    onClick={() => toggleMenu(contact.address)}
                  >
                    <Icon.DotsHorizontal />
                  </button>
                  {openMenuAddress === contact.address && (
                    <div className="ContactBook__row__menu">
                      <button
                        className="ContactBook__row__menu__item"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Icon.Edit05 />
                        {t("Edit contact")}
                      </button>
                      <button
                        className="ContactBook__row__menu__item"
                        onClick={() => handleCopyAddress(contact.address)}
                      >
                        <Icon.Copy01 />
                        {t("Copy address")}
                      </button>
                      <button
                        className="ContactBook__row__menu__item ContactBook__row__menu__item--destructive"
                        onClick={() => handleDeleteContact(contact)}
                      >
                        <Icon.Trash01 />
                        {t("Delete contact")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </View.Content>

      {cardMode && (
        <div className="ContactBook__overlay" onClick={handleDismissCard}>
          <div
            className="ContactBook__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <EditContactCard
              title={cardTitle}
              address={
                cardMode.type === "edit" ? cardMode.contact.address : undefined
              }
              name={
                cardMode.type === "edit" ? cardMode.contact.name : undefined
              }
              existingContacts={existingContacts}
              onSave={handleSaveContact}
              onCancel={handleDismissCard}
            />
          </div>
        </div>
      )}
    </>
  );
};

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

const EditContactCard = ({
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
