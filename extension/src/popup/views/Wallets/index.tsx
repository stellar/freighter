import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CopyText,
  Icon,
  Input,
  Notification,
} from "@stellar/design-system";
import classNames from "classnames";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { Account } from "@shared/api/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  makeAccountActive,
  updateAccountName,
} from "popup/ducks/accountServices";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import { truncatedPublicKey } from "helpers/stellar";
import { getColorPubKey } from "helpers/stellarIdenticon";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { useGetWalletsData } from "./hooks/useGetWalletsData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { reRouteOnboarding } from "popup/helpers/route";

import "./styles.scss";
import { WalletType } from "@shared/constants/hardwareWallet";

interface AddWalletProps {
  onBack: () => void;
}

const AddWallet = ({ onBack }: AddWalletProps) => {
  const actions = [
    {
      icon: <Icon.Activity stroke="#99D52A" />,
      color: "lime",
      title: "Create a new wallet",
      description: "Create a wallet from your seed phrase.",
      link: ROUTES.addAccount,
    },
    {
      icon: <Icon.Activity stroke="#D6409F" />,
      color: "purple",
      title: "Import a Stellar secret key",
      description: "Add a wallet using a secret key.",
      link: ROUTES.importAccount,
    },
    {
      icon: <Icon.ShieldPlus stroke="#3E63DD" />,
      color: "blue",
      title: "Connect a hardware wallet",
      description: "Add a wallet from a hardware wallet.",
      link: ROUTES.connectWallet,
    },
  ];
  return (
    <>
      <SubviewHeader
        title="Add another wallet"
        customBackAction={onBack}
        customBackIcon={<Icon.ArrowLeft />}
      />
      <View.Content hasNoTopPadding>
        <div className="AddWallet">
          {actions.map((action) => {
            const iconClasses = classNames(
              "AddWallet__row__icon",
              action.color,
            );
            return (
              <div key={action.title} className="AddWallet__row">
                <Link className="AddWallet__row-link" to={action.link}>
                  <div className={iconClasses}>{action.icon}</div>
                  <div className="AddWallet__row__title">{action.title}</div>
                  <div className="AddWallet__row__description">
                    {action.description}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </View.Content>
    </>
  );
};

interface FormValue {
  accountName: string;
}

interface RenameWalletProps {
  allAccounts: Account[];
  publicKey: string;
  onClose: () => void;
}

const RenameWallet = ({
  allAccounts,
  publicKey,
  onClose,
}: RenameWalletProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const account = allAccounts.find(
    (account) => account.publicKey === publicKey,
  )!;
  const accountName = account.name;
  const shortPublicKey = truncatedPublicKey(publicKey);
  const initialValues: FormValue = {
    accountName,
  };
  const handleSubmit = async (values: FormValue) => {
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
      await dispatch(
        updateAccountName({ accountName: newAccountName, publicKey }),
      );
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
  accountValue: string;
  isImported: boolean;
  hardwareWalletType?: WalletType;
  isSelected: boolean;
  publicKey: string;
  onClick: (publicKey: string) => unknown;
  setOptionsOpen: (publicKey: string) => unknown;
}

const WalletRow = ({
  accountName,
  accountValue,
  isImported,
  hardwareWalletType,
  isSelected,
  publicKey,
  onClick,
  setOptionsOpen,
}: WalletRowProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);
  const identiconWrapperStyles = classNames("identicon-wrapper", {
    "is-selected": isSelected,
  });
  const selectedBorderColorRgb = getColorPubKey(publicKey);
  const isSelectedColor = `rgb(${selectedBorderColorRgb.r} ${selectedBorderColorRgb.g} ${selectedBorderColorRgb.b} / 100%`;
  const borderColor = isSelected ? isSelectedColor : "#232323";
  const subTitle = accountValue
    ? `${shortPublicKey} - ${accountValue}`
    : shortPublicKey;
  const walletIdentifier = hardwareWalletType || isImported ? "Imported" : "";
  return (
    <div className="WalletRow">
      <div className="WalletRow__identicon" onClick={() => onClick(publicKey)}>
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
      <div className="WalletRow__details" onClick={() => onClick(publicKey)}>
        <p className="detail-name">{accountName}</p>
        <p className="detail-short-key">{subTitle}</p>
        <p className="detail-short-key">{walletIdentifier}</p>
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

export const Wallets = () => {
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = React.useState("");
  const [isAddingWallet, setIsAddingWallet] = React.useState(false);
  const [activeOptionsPublicKey, setActiveOptionsPublicKey] =
    React.useState("");
  const { state: dataState, fetchData } = useGetWalletsData();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (
    dataState.state === RequestState.IDLE ||
    dataState.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = dataState.state === RequestState.ERROR;

  if (dataState.data?.type === AppDataType.REROUTE) {
    if (dataState.data.shouldOpenTab) {
      openTab(newTabHref(dataState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${dataState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: dataState.data.type,
      applicationState: dataState.data?.applicationState,
      state: dataState.state,
    });
  }

  if (hasError) {
    return (
      <div className="Wallets__fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your wallets.")}
        >
          {t("Your wallets could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  const {
    allAccounts,
    publicKey: activePublicKey,
    accountValue,
  } = dataState.data;

  return (
    <React.Fragment>
      <SubviewHeader
        title="Wallets"
        customBackAction={() => navigateTo(ROUTES.account, navigate)}
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
            onClick={() => setIsAddingWallet(true)}
          >
            {t("Add a wallet")}
          </Button>
        }
      >
        <div>
          {allAccounts.map(
            ({ publicKey, name, imported, hardwareWalletType }) => {
              const isSelected = activePublicKey === publicKey;
              const totalValueUsd = accountValue ? accountValue[publicKey] : "";

              return (
                <>
                  <WalletRow
                    accountName={name}
                    accountValue={totalValueUsd}
                    isImported={imported}
                    hardwareWalletType={hardwareWalletType}
                    publicKey={publicKey}
                    isSelected={isSelected}
                    onClick={async (publicKey) => {
                      await dispatch(makeAccountActive(publicKey));
                      navigateTo(ROUTES.account, navigate);
                    }}
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
              allAccounts={allAccounts}
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
      {isAddingWallet ? (
        <div className="AddWalletWrapper">
          <AddWallet onBack={() => setIsAddingWallet(false)} />
        </div>
      ) : null}
    </React.Fragment>
  );
};
