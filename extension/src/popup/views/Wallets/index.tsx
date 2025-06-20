import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, CopyText, Icon, Input } from "@stellar/design-system";
import classNames from "classnames";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { AppDispatch } from "popup/App";
import { Account } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  accountNameSelector,
  updateAccountName,
} from "popup/ducks/accountServices";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import { truncatedPublicKey } from "helpers/stellar";
import { getColorPubKey } from "helpers/stellarIdenticon";

import "./styles.scss";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import { LoadingBackground } from "popup/basics/LoadingBackground";

interface FormValue {
  accountName: string;
}

interface RenameWalletProps {
  publicKey: string;
  onClose: () => void;
}

const RenameWallet = ({ publicKey, onClose }: RenameWalletProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const accountName = useSelector(accountNameSelector);
  const shortPublicKey = truncatedPublicKey(publicKey);
  const initialValues: FormValue = {
    accountName,
  };
  const handleSubmit = async (values: FormValue) => {
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
      await dispatch(updateAccountName(newAccountName));
      emitMetric(METRIC_NAMES.viewPublicKeyAccountRenamed);
      onClose();
    }
  };

  return (
    <View.Content hasNoTopPadding>
      <div className="RenameWallet">
        <Card>
          <p>Rename Wallet</p>
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validationSchema={YupObject().shape({
              accountName: YupString().max(
                24,
                t("max of 24 characters allowed"),
              ),
            })}
          >
            {({ errors }) => (
              <>
                <Form className="RenameWallet__form">
                  <Field name="accountName">
                    {({ field }: FieldProps) => (
                      <Input
                        autoFocus
                        fieldSize="md"
                        autoComplete="off"
                        id="accountName"
                        placeholder={accountName}
                        maxLength={24}
                        {...field}
                        error={errors.accountName}
                      />
                    )}
                  </Field>
                  <div className="RenameWallet__short-address">
                    Address: {shortPublicKey}
                  </div>
                  <div className="RenameWallet__actions">
                    <Button
                      type="button"
                      size="md"
                      isRounded
                      variant="tertiary"
                      onClick={onClose}
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="md"
                      isRounded
                      variant="secondary"
                    >
                      {t("Save")}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Formik>
        </Card>
      </div>
    </View.Content>
  );
};

interface WalletRowProps {
  accountName: string;
  isSelected: boolean;
  publicKey: string;
  onClick: (publicKey: string) => unknown;
  setOptionsOpen: (publicKey: string) => unknown;
}

const WalletRow = ({
  accountName,
  isSelected,
  publicKey,
  setOptionsOpen,
}: WalletRowProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);
  const identiconWrapperStyles = classNames("identicon-wrapper", {
    "is-selected": isSelected,
  });
  const selectedBorderColorRgb = getColorPubKey(publicKey);
  const isSelectedColor = `rgb(${selectedBorderColorRgb.r} ${selectedBorderColorRgb.g} ${selectedBorderColorRgb.b} / 100%`;
  const borderColor = isSelected ? isSelectedColor : "#232323";
  return (
    <div className="WalletRow">
      <div className="WalletRow__identicon">
        <div
          className={identiconWrapperStyles}
          style={{ borderColor: borderColor }}
        >
          <IdenticonImg publicKey={publicKey} />
        </div>
        {isSelected ? (
          <div
            className="WalletRow__identicon__selected-check"
            style={{ backgroundColor: isSelectedColor }}
          >
            <Icon.Check width="14px" height="14px" />
          </div>
        ) : null}
      </div>
      <div className="WalletRow__details">
        <p className="detail-name">{accountName}</p>
        <p className="detail-short-key">{shortPublicKey}</p>
      </div>
      <div
        className="WalletRow__options"
        onClick={() => setOptionsOpen(publicKey)}
      >
        <img src={IconEllipsis} alt="wallet action options" />
      </div>
    </div>
  );
};

interface WalletsProps {
  activePublicKey: string;
  allAccounts: Account[];
  close: () => void;
}

export const Wallets = ({
  activePublicKey,
  allAccounts,
  close,
}: WalletsProps) => {
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [isEditingName, setIsEditingName] = React.useState("");
  const [activeOptionsPublicKey, setActiveOptionsPublicKey] =
    React.useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        activeOptionsRef.current &&
        !activeOptionsRef.current.contains(event.target as Node)
      ) {
        setActiveOptionsPublicKey("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeOptionsRef]);

  return (
    <React.Fragment>
      <SubviewHeader
        title="Wallets"
        customBackAction={close}
        customBackIcon={<Icon.XClose />}
      />
      <View.Content
        hasNoTopPadding
        contentFooter={
          <Button
            size="md"
            isFullWidth
            isRounded
            variant="secondary"
            iconPosition="left"
            icon={<Icon.PlusCircle />}
            onClick={() => {}}
          >
            {t("Add a wallet")}
          </Button>
        }
      >
        <div>
          {allAccounts.map(
            ({ publicKey, name, imported, hardwareWalletType }) => {
              const isSelected = activePublicKey === publicKey;
              console.log(imported, hardwareWalletType);

              return (
                <>
                  <WalletRow
                    accountName={name}
                    publicKey={publicKey}
                    isSelected={isSelected}
                    onClick={(publicKey) => console.log(publicKey)}
                    setOptionsOpen={setActiveOptionsPublicKey}
                  />
                  {activeOptionsPublicKey === publicKey ? (
                    <div
                      className="WalletRow__options-actions"
                      ref={activeOptionsRef}
                    >
                      <div
                        className="WalletRow__options-actions__row"
                        onClick={() => {
                          setIsEditingName(publicKey);
                          setActiveOptionsPublicKey("");
                        }}
                      >
                        <div className="action-copy">
                          <div className="WalletRow__options-actions__label">
                            Rename wallet
                          </div>
                          <Icon.Edit05 />
                        </div>
                      </div>
                      <div className="WalletRow__options-actions__row">
                        <CopyText textToCopy={publicKey}>
                          <div className="action-copy">
                            <div className="WalletRow__options-actions__label">
                              Copy address
                            </div>
                            <Icon.Copy01 />
                          </div>
                        </CopyText>
                      </div>
                    </div>
                  ) : null}
                </>
              );
            },
          )}
        </div>
      </View.Content>
      {isEditingName ? (
        <>
          <div className="RenameWalletWrapper">
            <RenameWallet
              publicKey={isEditingName}
              onClose={() => setIsEditingName("")}
            />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingName("")}
            isActive={isEditingName.length > 0}
          />
        </>
      ) : null}
    </React.Fragment>
  );
};
