import React from "react";

const currentAccountName = "Account Name";

export const Account = () => (
  <div className="AccountView" data-testid="account-view">
    <div className="AccountView__account-actions">
      <div className="AccountView__name-key-display">
        <div
          className="AccountView__account-name"
          data-testid="account-view-account-name"
        >
          {currentAccountName}
        </div>
        {/* <CopyText
      textToCopy={publicKey}
      tooltipPlacement="bottom"
      doneLabel="Copied address"
    >
      <div className="AccountView__account-num">
        <Icon.Copy01 />
      </div>
    </CopyText> */}
      </div>
      <div className="AccountView__send-receive-display">
        <div className="AccountView__send-receive-button">
          {/* <NavButton
        showBorder
        title={t("Send Payment")}
        id="nav-btn-send"
        icon={<Icon.Send01 />}
        onClick={() => navigateTo(ROUTES.sendPayment)}
      /> */}
        </div>
        <div
          className="AccountView__send-receive-button"
          data-testid="account-options-dropdown"
        >
          {/* <AccountOptionsDropdown isFunded={!!isFunded} /> */}
        </div>
      </div>
    </div>
    {/* {hasError && (
  <div className="AccountView__fetch-fail">
    <Notification
      variant="error"
      title={t("Failed to fetch your account balances.")}
    >
      {t(
        "Your account balances could not be fetched at this time.",
      )}
    </Notification>
  </div>
)}
{!isSorobanSuported && (
  <div className="AccountView__fetch-fail">
    <Notification
      title={t("Soroban RPC is temporarily experiencing issues")}
      variant="primary"
    >
      {t("Some features may be disabled at this time.")}
    </Notification>
  </div>
)}
{error?.horizon && (
  <div className="AccountView__fetch-fail">
    <Notification
      title={t("Horizon is temporarily experiencing issues")}
      variant="primary"
    >
      {t(
        "Some of your assets may not appear, but they are still safe on the network!",
      )}
    </Notification>
  </div>
)}
{userNotification?.enabled && (
  <div className="AccountView__fetch-fail">
    <Notification
      title={t("Please note the following message")}
      variant="primary"
    >
      {userNotification.message}
    </Notification>
  </div>
)}
{isFullscreenModeEnabled && (
  <div className="AccountView__fullscreen">
    <Notification
      title={t("You are in fullscreen mode")}
      variant="primary"
    >
      {t(
        "Note that you will need to reload this tab to load any account changes that happen outside this session. For your own safety, please close this window when you are done.",
      )}
    </Notification>
  </div>
)}

{isFunded && !hasError && (
  <div
    className="AccountView__assets-wrapper"
    data-testid="account-assets"
  >
    <AccountAssets
      sortedBalances={sortedBalances}
      assetIcons={assetIcons}
      setSelectedAsset={setSelectedAsset}
    />
  </div>
)} */}
  </div>
);

export default Account;
