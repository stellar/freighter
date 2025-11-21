import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
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
  allAccountsSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { clearBalancesForAccount } from "popup/ducks/cache";
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
import { WalletType } from "@shared/constants/hardwareWallet";

import "./styles.scss";

interface AddWalletProps {
  onBack: () => void;
}

const AddWallet = ({ onBack }: AddWalletProps) => {
  const { t } = useTranslation();
  const actions = [
    {
      icon: <Icon.Activity stroke="#99D52A" />,
      color: "lime",
      title: t("Create new wallet"),
      description: t("Create a wallet from your seed phrase."),
      link: ROUTES.addAccount,
    },
    {
      icon: <Icon.Activity stroke="#D6409F" />,
      color: "purple",
      title: t("Import Stellar Secret Key"),
      description: t("Add a wallet using a secret key."),
      link: ROUTES.importAccount,
    },
    {
      icon: <Icon.ShieldPlus stroke="#3E63DD" />,
      color: "blue",
      title: t("Connect a hardware wallet"),
      description: t("Add a wallet from a hardware wallet."),
      link: ROUTES.connectWallet,
    },
  ];
  return (
    <>
      <SubviewHeader
        title={t("Add another wallet")}
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
  onSubmit: () => void;
}

const RenameWallet = ({
  allAccounts,
  publicKey,
  onClose,
  onSubmit,
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
      onSubmit();
      onClose();
    }
  };

  return (
    <View.Content hasNoTopPadding>
      <div className="RenameWallet">
        <Card>
          <p>{t("Rename Wallet")}</p>
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
                        data-testid="rename-wallet-input"
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
                    {t("Address:")} {shortPublicKey}
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
  isFetchingTokenPrices: boolean;
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
  isFetchingTokenPrices,
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

  let subTitle = accountValue
    ? `${shortPublicKey} - ${accountValue}`
    : shortPublicKey;
  if (isFetchingTokenPrices && !accountValue) {
    subTitle = `${shortPublicKey} - ...`;
  }
  const { t } = useTranslation();
  const walletIdentifier =
    hardwareWalletType || isImported ? t("Imported") : "";
  return (
    <div className="WalletRow">
      <div
        className="WalletRow__identicon"
        onClick={() => onClick(publicKey)}
        data-testid="wallet-row-select"
      >
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
        data-testid="wallet-row-options"
        onClick={() => setOptionsOpen(publicKey)}
      >
        <img src={IconEllipsis} alt={t("wallet action options")} />
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
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const allAccounts = useSelector(allAccountsSelector);

  useEffect(() => {
    const getData = async () => {
      await fetchData(true);
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

  const isFetchingTokenPrices = dataState.data?.isFetchingTokenPrices || false;

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

  const { publicKey: activePublicKey, accountValue } = dataState.data;

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Wallets")}
        customBackAction={() => navigateTo(ROUTES.account, navigate)}
        customBackIcon={<Icon.XClose />}
      />
      <View.Content
        hasNoTopPadding
        contentFooter={
          <Button
            size="lg"
            isFullWidth
            isRounded
            variant="secondary"
            iconPosition="left"
            icon={<Icon.PlusCircle />}
            onClick={() => setIsAddingWallet(true)}
            data-testid="add-wallet"
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
                    key={publicKey}
                    isFetchingTokenPrices={isFetchingTokenPrices}
                    accountName={name}
                    accountValue={totalValueUsd}
                    isImported={imported}
                    hardwareWalletType={hardwareWalletType}
                    publicKey={publicKey}
                    isSelected={isSelected}
                    onClick={async (publicKey) => {
                      await dispatch(makeAccountActive(publicKey));
                      await dispatch(
                        clearBalancesForAccount({ publicKey, networkDetails }),
                      );
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
                            {t("Rename Wallet")}
                          </div>
                          <Icon.Edit05 />
                        </div>
                      </div>
                      <div className="WalletRow__options-actions__row">
                        <CopyText textToCopy={publicKey}>
                          <div className="action-copy">
                            <div className="WalletRow__options-actions__label">
                              {t("Copy address")}
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
              onSubmit={fetchData}
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
