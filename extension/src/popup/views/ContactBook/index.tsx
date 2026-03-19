import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import { toast } from "sonner";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { EditContactCard } from "popup/components/EditContactCard";
import {
  truncatedPublicKey,
  truncatedFedAddress,
  isFederationAddress,
  isMuxedAccount,
  getBaseAccount,
} from "helpers/stellar";
import { Toaster } from "popup/basics/shadcn/Toast";

import "./styles.scss";

export const CONTACT_BOOK_TOASTER_ID = "contact-book-toaster";

export interface ContactData {
  name: string;
  resolvedAddress?: string;
}

export type ContactsMap = Record<string, ContactData>;

const INITIAL_CONTACTS: ContactsMap = {};

type CardMode =
  | { type: "add" }
  | { type: "edit"; address: string; data: ContactData };

export const ContactBook = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ContactsMap>(INITIAL_CONTACTS);
  const [cardMode, setCardMode] = useState<CardMode | null>(null);
  const [openMenuAddress, setOpenMenuAddress] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFormDirtyRef = useRef(false);

  const handleFormDirtyChange = useCallback((dirty: boolean) => {
    isFormDirtyRef.current = dirty;
  }, []);

  const handleAddContact = useCallback(() => {
    setOpenMenuAddress(null);
    setCardMode({ type: "add" });
  }, []);

  const handleEditContact = useCallback(
    (address: string, data: ContactData) => {
      setCardMode({ type: "edit", address, data });
      setOpenMenuAddress(null);
    },
    [],
  );

  const handleCopyAddress = useCallback(
    async (address: string) => {
      try {
        await navigator.clipboard.writeText(address);
        toast.success(t("Address copied"), {
          toasterId: CONTACT_BOOK_TOASTER_ID,
          className: "ContactBook__toast",
        });
      } catch {
        toast.error(t("Failed to copy address"), {
          toasterId: CONTACT_BOOK_TOASTER_ID,
          className: "ContactBook__toast",
        });
      } finally {
        setOpenMenuAddress(null);
      }
    },
    [t, setOpenMenuAddress],
  );

  const handleDeleteContact = useCallback(
    (address: string) => {
      try {
        setContacts((prev) => {
          const { [address]: _, ...rest } = prev;
          return rest;
        });
        toast.success(t("Contact successfully deleted"), {
          toasterId: CONTACT_BOOK_TOASTER_ID,
          className: "ContactBook__toast",
        });
        setOpenMenuAddress(null);
      } catch {
        toast.error(t("Failed to delete contact"), {
          toasterId: CONTACT_BOOK_TOASTER_ID,
          className: "ContactBook__toast",
        });
      }
    },
    [t],
  );

  const handleSaveContact = useCallback(
    (address: string, name: string, resolvedAddress?: string) => {
      try {
        if (cardMode?.type === "edit") {
          setContacts((prev) => {
            const { [cardMode.address]: _, ...rest } = prev;
            return { ...rest, [address]: { name, resolvedAddress } };
          });
        } else if (cardMode?.type === "add") {
          setContacts((prev) => ({
            ...prev,
            [address]: { name, resolvedAddress },
          }));
          toast.success(t("Contact successfully added"), {
            toasterId: CONTACT_BOOK_TOASTER_ID,
            className: "ContactBook__toast",
          });
        }
        isFormDirtyRef.current = false;
        setCardMode(null);
      } catch {
        toast.error(t("Failed to save contact"), {
          toasterId: CONTACT_BOOK_TOASTER_ID,
          className: "ContactBook__toast",
        });
      }
    },
    [cardMode, t],
  );

  const handleDismissCard = useCallback(() => {
    if (
      isFormDirtyRef.current &&
      !window.confirm(t("You have unsaved changes. Discard them?"))
    ) {
      return;
    }
    isFormDirtyRef.current = false;
    setCardMode(null);
  }, [t]);

  const toggleMenu = useCallback((address: string) => {
    setOpenMenuAddress((prev) => (prev === address ? null : address));
  }, []);

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

  const sortedEntries = useMemo(
    () =>
      Object.entries(contacts).sort(([, a], [, b]) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      ),
    [contacts],
  );

  const cardTitle =
    cardMode?.type === "edit" ? t("Edit a Contact") : t("Add a Contact");

  const existingContacts: ContactsMap =
    cardMode?.type === "edit"
      ? Object.fromEntries(
          Object.entries(contacts).filter(
            ([addr]) => addr !== cardMode.address,
          ),
        )
      : contacts;

  return (
    <>
      <SubviewHeader
        title={t("Contact Book")}
        customBackIcon={<Icon.X />}
        rightButton={
          <button
            type="button"
            className="ContactBook__add-button"
            aria-label={t("Add a contact")}
            onClick={handleAddContact}
          >
            <Icon.Plus />
          </button>
        }
      />
      <Toaster id={CONTACT_BOOK_TOASTER_ID} closeButton />

      <View.Content hasNoTopPadding>
        {sortedEntries.length === 0 ? (
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
            {sortedEntries.map(([address, data]) => (
              <div key={address} className="ContactBook__row">
                <div className="ContactBook__row__info">
                  <div className="ContactBook__row__identicon">
                    <IdenticonImg
                      publicKey={
                        data.resolvedAddress ||
                        (isMuxedAccount(address)
                          ? (getBaseAccount(address) ?? address)
                          : address)
                      }
                    />
                  </div>
                  <div className="ContactBook__row__details">
                    <span className="ContactBook__row__name">{data.name}</span>
                    <span className="ContactBook__row__address">
                      {isFederationAddress(address)
                        ? truncatedFedAddress(address)
                        : truncatedPublicKey(address)}
                    </span>
                  </div>
                </div>
                <div
                  className="ContactBook__row__menu-wrapper"
                  ref={openMenuAddress === address ? menuRef : null}
                >
                  <button
                    type="button"
                    className="ContactBook__row__menu-trigger"
                    aria-label={t("Contact actions")}
                    onClick={() => toggleMenu(address)}
                  >
                    <Icon.DotsHorizontal />
                  </button>
                  {openMenuAddress === address && (
                    <div className="ContactBook__row__menu">
                      <button
                        className="ContactBook__row__menu__item"
                        onClick={() => handleEditContact(address, data)}
                      >
                        <Icon.Edit05 />
                        {t("Edit contact")}
                      </button>
                      <button
                        className="ContactBook__row__menu__item"
                        onClick={() => handleCopyAddress(address)}
                      >
                        <Icon.Copy01 />
                        {t("Copy address")}
                      </button>
                      <button
                        className="ContactBook__row__menu__item ContactBook__row__menu__item--destructive"
                        onClick={() => handleDeleteContact(address)}
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
              address={cardMode.type === "edit" ? cardMode.address : undefined}
              name={cardMode.type === "edit" ? cardMode.data.name : undefined}
              resolvedAddress={
                cardMode.type === "edit"
                  ? cardMode.data.resolvedAddress
                  : undefined
              }
              existingContacts={existingContacts}
              onSave={handleSaveContact}
              onCancel={handleDismissCard}
              onDirtyChange={handleFormDirtyChange}
            />
          </div>
        </div>
      )}
    </>
  );
};
