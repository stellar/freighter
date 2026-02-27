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
import { truncatedPublicKey } from "helpers/stellar";
import { Toaster } from "popup/basics/shadcn/Toast";

import "./styles.scss";

export interface ContactData {
  name: string;
  resolvedAddress?: string;
}

export type ContactsMap = Record<string, ContactData>;

// const INITIAL_CONTACTS: ContactsMap = {
//   GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: {
//     name: "Piyal",
//   },
//   GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH: {
//     name: "Cassio",
//   },
// };
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

  const handleAddContact = useCallback(() => {
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
      await navigator.clipboard.writeText(address);
      toast.success(t("Address copied"), { className: "ContactBook__toast" });
      setOpenMenuAddress(null);
    },
    [t],
  );

  const handleDeleteContact = useCallback(
    (address: string) => {
      setContacts((prev) => {
        const { [address]: _, ...rest } = prev;
        return rest;
      });
      toast.success(t("Contact successfully deleted"), {
        className: "ContactBook__toast",
      });
      setOpenMenuAddress(null);
    },
    [t],
  );

  const handleSaveContact = useCallback(
    (address: string, name: string, resolvedAddress?: string) => {
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
          className: "ContactBook__toast",
        });
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
                    <IdenticonImg publicKey={data.resolvedAddress || address} />
                  </div>
                  <div className="ContactBook__row__details">
                    <span className="ContactBook__row__name">{data.name}</span>
                    <span className="ContactBook__row__address">
                      {truncatedPublicKey(address)}
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
            <Toaster closeButton />
            <EditContactCard
              title={cardTitle}
              address={cardMode.type === "edit" ? cardMode.address : undefined}
              name={cardMode.type === "edit" ? cardMode.data.name : undefined}
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
