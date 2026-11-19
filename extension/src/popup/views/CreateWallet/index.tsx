import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Icon, Notification } from "@stellar/design-system";
import { Trans, useTranslation } from "react-i18next";

import {
  clearPendingRecoveryPhrase,
  generateRecoveryPhrase,
} from "@shared/api/internal";
import { getNextDefaultAccountName } from "@shared/helpers/accountName";
import { PENDING_PHRASE_MISSING_ERROR } from "@shared/constants/errors";
import { emitMetric } from "helpers/metrics";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { closeWindow, navigateTo, openTab } from "popup/helpers/navigate";
import { reRouteOnboarding } from "popup/helpers/route";
import {
  AccountGroupKind,
  groupAccountsBySource,
} from "popup/helpers/accountGroups";
import {
  activeAccountIdSelector,
  addAccount,
  addRecoveryPhraseSource,
  clearApiError,
  secretSourcesSelector,
} from "popup/ducks/accountServices";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { ScreenTitle } from "popup/components/ScreenTitle";
import { View } from "popup/basics/layout/View";
import { Loading } from "popup/components/Loading";
import { SlideupModal } from "popup/components/SlideupModal";
import { SheetLayout } from "popup/components/SheetLayout";
import { EnterPassword } from "popup/components/EnterPassword";
import { WalletRow } from "popup/components/account/WalletRow";
import { AccountNameForm } from "popup/components/account/AccountNameForm";
import { PhraseGrid } from "popup/components/mnemonicPhrase/PhraseGrid";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";

import "popup/views/AddWallet/styles.scss";
import "./styles.scss";

/*
  Create new wallet: add an account under one of the wallet's recovery
  phrases, or generate a new phrase and start its first account.

  select: the phrases, each with its accounts and Add account, then Generate.
  backup: the generated phrase, hidden until the user asks to see it.
  password: re-authentication before anything is stored. Mobile uses Face ID
    here; the extension needs the password to encrypt the new keystore.

  The account name is set in a sheet over select, before either path goes on.
*/
type Step = "select" | "backup" | "password";

type Target =
  | { kind: "existingPhrase"; sourceId: string }
  | { kind: "newPhrase" };

export const CreateWallet = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { state, fetchData } = useGetWalletsData();
  const secretSources = useSelector(secretSourcesSelector);
  const activeAccountId = useSelector(activeAccountIdSelector);

  const [step, setStep] = useState<Step>("select");
  const [target, setTarget] = useState<Target | null>(null);
  const [isNaming, setIsNaming] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [phrase, setPhrase] = useState("");
  // Names this window's generation; see `AddRecoveryPhraseSourceMessage`. A
  // ref, so the unmount cleanup sees the current id.
  const pendingPhraseIdRef = useRef("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // The background holds the generated phrase until it's stored. Tell it to
  // drop this window's generation when the user backs out or leaves.
  const dropPendingPhrase = () => {
    const id = pendingPhraseIdRef.current;
    pendingPhraseIdRef.current = "";
    if (id) {
      void clearPendingRecoveryPhrase(id);
    }
  };

  useEffect(() => {
    fetchData(true);
    return () => {
      dropPendingPhrase();
      dispatch(clearApiError());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    (state.state === RequestState.IDLE ||
      state.state === RequestState.LOADING) &&
    !state.data
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR || !state.data) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your wallets.")}
        >
          {t("Your wallets could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      closeWindow();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.applicationState,
    state: state.state,
  });

  const { allAccounts, accountValue, isFetchingTokenPrices } = state.data;
  // A wallet with no phrase (a secret-key start) lists nothing here, and
  // generating is the only way on.
  const phraseGroups = groupAccountsBySource({
    accounts: allAccounts,
    sources: secretSources,
    t,
  }).filter(({ kind }) => kind === AccountGroupKind.PHRASE);
  const defaultAccountName = getNextDefaultAccountName(
    allAccounts.map(({ name }) => name),
  );

  const startNaming = (next: Target) => {
    setErrorMessage("");
    setTarget(next);
    setIsNaming(true);
  };

  const handleNamed = async (name: string) => {
    setAccountName(name);

    if (target?.kind === "newPhrase") {
      try {
        const { mnemonicPhrase, pendingPhraseId: id } =
          await generateRecoveryPhrase();
        setPhrase(mnemonicPhrase);
        pendingPhraseIdRef.current = id;
        setIsRevealed(false);
        setIsNaming(false);
        setStep("backup");
      } catch (e) {
        setIsNaming(false);
        setErrorMessage(t("Unable to generate a recovery phrase"));
      }
      return;
    }

    setIsNaming(false);
    setStep("password");
  };

  const handlePassword = async (password: string) => {
    if (!target) {
      return;
    }

    const res =
      target.kind === "newPhrase"
        ? await dispatch(
            addRecoveryPhraseSource({
              password,
              accountName,
              pendingPhraseId: pendingPhraseIdRef.current,
            }),
          )
        : await dispatch(
            addAccount({
              password,
              sourceId: target.sourceId,
              accountName,
            }),
          );

    if (
      addAccount.fulfilled.match(res) ||
      addRecoveryPhraseSource.fulfilled.match(res)
    ) {
      emitMetric(METRIC_NAMES.accountCreated, {
        number_of_accounts: res.payload.allAccounts.length,
        source: target.kind === "newPhrase" ? "new_phrase" : "existing_phrase",
      });
      // Stored, so the background has already dropped it.
      pendingPhraseIdRef.current = "";
      setPhrase("");
      navigateTo(ROUTES.account, navigate);
      return;
    }

    // Another window's generation replaced this one, so the phrase on the
    // backup step was never stored. Drop it rather than let Back show it
    // again, and start over from the chooser.
    if (
      addRecoveryPhraseSource.rejected.match(res) &&
      res.payload?.errorMessage === PENDING_PHRASE_MISSING_ERROR
    ) {
      backToSelect();
      setErrorMessage(
        t("The new recovery phrase is no longer available. Start again."),
      );
    }
  };

  const backToSelect = () => {
    dropPendingPhrase();
    setPhrase("");
    setIsRevealed(false);
    dispatch(clearApiError());
    setStep("select");
  };

  if (step === "password") {
    return (
      <React.Fragment>
        <SubviewHeader
          title=""
          customBackAction={() => {
            dispatch(clearApiError());
            setStep(target?.kind === "newPhrase" ? "backup" : "select");
          }}
        />
        <EnterPassword
          onConfirm={handlePassword}
          confirmButtonTitle={t("Create")}
        />
      </React.Fragment>
    );
  }

  if (step === "backup") {
    return (
      <React.Fragment>
        <SubviewHeader
          title=""
          customBackAction={backToSelect}
          rightButton={
            <button
              type="button"
              className="CreateWallet__close"
              aria-label={t("Close")}
              onClick={() => navigateTo(ROUTES.account, navigate)}
              data-testid="create-wallet-close"
            >
              <Icon.X />
            </button>
          }
        />
        {/* Keyed per step so it opens at the top, not at the list's scroll
          position, which the shared scroll container would otherwise keep. */}
        <View.Content hasNoTopPadding key="backup">
          <ScreenTitle
            title={t("Back up your Recovery Phrase")}
            subtitle={
              <Trans
                i18nKey="Your recovery phrase is the only way to restore your new wallet. <strong>Keep it safe.</strong>"
                components={{
                  strong: <strong className="CreateWallet__keep-safe" />,
                }}
              />
            }
          />
          <div className="CreateWallet__backup">
            <div className="CreateWallet__backup__phrase">
              <PhraseGrid
                phrase={phrase}
                isHidden={!isRevealed}
                testId="create-wallet-phrase"
              />
              {isRevealed ? null : (
                <div className="CreateWallet__backup__hidden-icon">
                  <Icon.EyeOff />
                </div>
              )}
            </div>
          </div>
        </View.Content>
        <View.Footer customHeight="auto" customGap="0.75rem">
          {isRevealed ? (
            <>
              {/* No Tap to copy: the phrase stays off the clipboard. */}
              <div className="CreateWallet__backup__warning">
                {t("Make sure you've saved it.")}{" "}
                {t("You can't recover your wallet without it.")}
              </div>
              <Button
                size="lg"
                isFullWidth
                isRounded
                variant="secondary"
                onClick={() => setStep("password")}
                data-testid="create-wallet-phrase-create"
              >
                {t("Create a wallet")}
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="secondary"
              onClick={() => setIsRevealed(true)}
              data-testid="create-wallet-phrase-reveal"
            >
              {t("I understand. Reveal my phrase")}
            </Button>
          )}
        </View.Footer>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <SubviewHeader
        title=""
        customBackAction={() => navigateTo(ROUTES.addWallet, navigate)}
      />
      <View.Content hasNoTopPadding key="select">
        <ScreenTitle
          title={t("Create new wallet")}
          subtitle={t("Create with a new or existing recovery phrase")}
        />
        <div className="CreateWallet" data-testid="create-wallet">
          {errorMessage ? (
            <Notification variant="error" title={errorMessage} />
          ) : null}
          <button
            type="button"
            className="AddWallet__row"
            onClick={() => startNaming({ kind: "newPhrase" })}
            data-testid="create-wallet-generate"
          >
            <span className="AddWallet__row__icon">
              <Icon.Plus />
            </span>
            <span className="AddWallet__row__text">
              <span className="AddWallet__row__title">
                {t("Generate new recovery phrase")}
              </span>
              <span className="AddWallet__row__description">
                {t("Create a wallet with a new recovery phrase")}
              </span>
            </span>
          </button>
          {phraseGroups.map((group) => (
            <section
              key={group.key}
              className="CreateWallet__group"
              data-testid="create-wallet-group"
            >
              <div className="CreateWallet__group__label">{group.label}</div>
              {group.accounts.map((account) => (
                <WalletRow
                  key={account.id}
                  isFetchingTokenPrices={isFetchingTokenPrices}
                  accountName={account.name}
                  accountValue={accountValue?.[account.publicKey]}
                  publicKey={account.publicKey}
                  isSelected={account.id === activeAccountId}
                />
              ))}
              <button
                type="button"
                className="CreateWallet__group__add"
                onClick={() =>
                  startNaming({
                    kind: "existingPhrase",
                    sourceId: group.sourceId!,
                  })
                }
                aria-label={t("Add account to {{label}}", {
                  label: group.label,
                })}
                data-testid="create-wallet-add-account"
              >
                <span className="AddWallet__row__icon">
                  <Icon.Plus />
                </span>
                {t("Add account")}
              </button>
            </section>
          ))}
        </div>
      </View.Content>
      <SlideupModal
        isModalOpen={isNaming}
        setIsModalOpen={setIsNaming}
        ariaLabel={t("Set account name")}
      >
        <SheetLayout>
          {isNaming ? (
            <AccountNameForm
              title={t("Set account name")}
              initialName={defaultAccountName}
              submitLabel={
                target?.kind === "newPhrase" ? t("Next") : t("Create")
              }
              onSubmit={handleNamed}
              onClose={() => setIsNaming(false)}
              testIdPrefix="set-account-name"
            />
          ) : (
            <div />
          )}
        </SheetLayout>
      </SlideupModal>
    </React.Fragment>
  );
};
