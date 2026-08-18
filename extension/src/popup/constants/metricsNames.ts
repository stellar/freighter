export const METRIC_NAMES = {
  // Domain (action/outcome) event catalog, shared cross-platform.
  //
  // Grammar: `domain.action_past` — a dotted domain prefix followed by a
  // snake_case, past-tense action. Outcomes get their own terminal events
  // (`completed` / `failed` / `rejected` / `blocked` / `submitted`) rather
  // than a single event with a status flag; a `result` property is used only
  // where the attempt itself is the analytical unit (Blockaid scans).
  //
  // A user rejecting a prompt (`*_rejected`) is always kept distinct from a
  // runtime error (`*_failed`). `schema_version` and the rest of the volatile
  // context (network, surface, account fields) are stamped by
  // buildCommonContext — never hand-add them at a call site.

  // -- Payments (direct, non-routed sends) --------------------------------
  paymentRecipientRecentSelected: "payment.recipient_recent_selected",
  paymentMaxAmountSelected: "payment.max_amount_selected",
  paymentFeeBreakdownOpened: "payment.fee_breakdown_opened",
  // UI selection of the send type. `payment_type` distinguishes
  // `payment` vs `path_payment` — it is a selection, not an outcome, so both
  // selections share this one event. Reserved: not currently emitted on either
  // platform (legacy type-selection events were retired without a replacement).
  paymentTypeSelected: "payment.type_selected",
  // Direct (non-routed) payment outcomes. Routed/path payments settle as
  // swaps (see swapCompleted / swapFailed below).
  paymentCompleted: "payment.completed",
  paymentFailed: "payment.failed",
  paymentSimulationFailed: "payment.simulation_failed",

  // -- Swap (first-class; also the home of routed/path-payment outcomes) ---
  swapPickerOpened: "swap.picker_opened",
  swapSourceSelected: "swap.source_selected",
  swapDestinationSelected: "swap.destination_selected",
  swapDirectionToggled: "swap.direction_toggled",
  swapTrustlineAdded: "swap.trustline_added",
  swapXlmReserveInsufficientShown: "swap.xlm_reserve_insufficient_shown",
  swapQuoteExpired: "swap.quote_expired",
  swapCompleted: "swap.completed",
  swapFailed: "swap.failed",

  // -- Collectibles --------------------------------------------------------
  collectibleSendCompleted: "collectible_send.completed",
  collectibleSendFailed: "collectible_send.failed",

  // -- Transaction submission ---------------------------------------------
  // dApp sign-and-submit event. RESERVED / never emitted on the extension:
  // the extension dApp API only signs-and-returns (no submit path), and
  // internal broadcasts are covered by payment/swap/collectible_send.completed.
  // Mobile emits it (sign-and-submit); kept here for a shared catalog. Do NOT
  // build a cross-platform transaction.submitted funnel expecting ext data.
  transactionSubmitted: "transaction.submitted",

  // -- Discovery -----------------------------------------------------------
  discoverProtocolOpened: "discover.protocol_opened",
  discoverProtocolDetailsViewed: "discover.protocol_details_viewed",
  discoverProtocolOpenedFromDetails: "discover.protocol_opened_from_details",
  discoverWelcomeModalViewed: "discover.welcome_modal_viewed",

  // -- Assets / trustlines -------------------------------------------------
  assetAdded: "asset.added",
  assetRemoved: "asset.removed",
  assetOperationFailed: "asset.operation_failed",
  assetListModified: "asset_list.modified",
  // Add-token prompt response. `decision` = confirm | reject.
  assetAddResponded: "asset_add.responded",
  // Remove-token prompt response. `decision` = confirm | reject.
  assetRemoveResponded: "asset_remove.responded",
  // Trustline removal blocked by chain state; `reason_code` carries which.
  trustlineRemoveFailed: "trustline_remove.failed",
  // Token add/remove initiated through the injected dApp API.
  assetAddApiCompleted: "asset_add_api.completed",
  assetAddApiFailed: "asset_add_api.failed",
  assetAddApiCancelled: "asset_add_api.cancelled",

  // -- Onboarding / account creation --------------------------------------
  onboardingPasswordCreated: "onboarding.password_created",
  onboardingPasswordCreateFailed: "onboarding.password_create_failed",
  onboardingRecoveryPhraseViewed: "onboarding.recovery_phrase_viewed",
  onboardingRecoveryPhraseConfirmed: "onboarding.recovery_phrase_confirmed",
  onboardingRecoveryPhraseConfirmFailed:
    "onboarding.recovery_phrase_confirm_failed",
  // Not emitted on extension: the create-account recovery-phrase screens have
  // no Back affordance to instrument. Mobile emits it; kept for a shared catalog.
  onboardingRecoveryPhraseBackClicked: "onboarding.recovery_phrase_back_clicked",
  onboardingCompleted: "onboarding.completed",

  // -- Account recovery / management --------------------------------------
  accountRecoveryCompleted: "account_recovery.completed",
  accountRecoveryFailed: "account_recovery.failed",
  accountCreated: "account.created",
  accountImported: "account.imported",
  accountImportFailed: "account.import_failed",
  // Extension-only: no mobile equivalent (mobile has no first-funded milestone
  // detector). Documented cross-platform asymmetry.
  accountFirstFunded: "account.first_funded",
  accountRenamed: "account.renamed",
  accountPublicKeyCopied: "account.public_key_copied",
  accountStellarExpertOpened: "account.stellar_expert_opened",

  // -- Re-authentication (unlock) -----------------------------------------
  // Not part of the shared cross-platform mapping; named to the same grammar
  // for consistency.
  reauthCompleted: "reauth.completed",
  reauthFailed: "reauth.failed",

  // -- Recovery phrase (backup) -------------------------------------------
  // Not emitted on extension: the mnemonic UI (MnemonicDisplay /
  // DisplayBackupPhrase) has no copy or download affordance to instrument.
  // Mobile emits `copied`; `downloaded` is reserved on both platforms. Kept for
  // a shared catalog. Never attach the phrase itself.
  recoveryPhraseCopied: "recovery_phrase.copied",
  recoveryPhraseDownloaded: "recovery_phrase.downloaded",

  // -- dApp access ---------------------------------------------------------
  dappAccessGranted: "dapp_access.granted",
  dappAccessRejected: "dapp_access.rejected",
  // Not emitted on extension: GrantAccess only opens from an already-unlocked
  // popup, so there is no locked-state auto-decline path. Mobile emits it when a
  // WalletConnect proposal arrives while not authenticated ({ origin,
  // reason_code: "not_authenticated" }). Kept for a shared catalog so a future
  // system-decline never reuses the user-decision dapp_access.rejected.
  dappAccessBlocked: "dapp_access.blocked",

  // -- Signing -------------------------------------------------------------
  signingTransactionApproved: "signing.transaction_approved",
  signingTransactionRejected: "signing.transaction_rejected",
  signingTransactionBlocked: "signing.transaction_blocked",
  signingAuthEntryApproved: "signing.auth_entry_approved",
  signingAuthEntryRejected: "signing.auth_entry_rejected",
  signingAuthEntryFailed: "signing.auth_entry_failed",
  signingMessageApproved: "signing.message_approved",
  signingMessageRejected: "signing.message_rejected",
  signingMessageFailed: "signing.message_failed",

  // -- History -------------------------------------------------------------
  historyFullHistoryOpened: "history.full_history_opened",
  historyItemOpened: "history.item_opened",

  // -- On-ramp -------------------------------------------------------------
  onrampCoinbaseOpened: "onramp.coinbase_opened",

  // -- Blockaid (consolidated: one completed + one failed event, keyed by
  //    scan_target = domain | transaction | asset, with a `result`) --------
  blockaidScanCompleted: "blockaid.scan_completed",
  blockaidScanFailed: "blockaid.scan_failed",
  // A user-submitted Blockaid warning report — distinct from a scan (no result).
  blockaidWarningReported: "blockaid.warning_reported",

  appOpened: "app.opened",

  // Canonical, consolidated screen-view event. Screen identity is carried in
  // the `screen_name` property (plus `flow`, `surface`, and `step` where a
  // screen is a sub-step). See helpers/metrics#emitScreenViewed.
  screenViewed: "screen.viewed",
};
