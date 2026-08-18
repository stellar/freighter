import { METRIC_NAMES } from "popup/constants/metricsNames";

describe("METRIC_NAMES domain-event catalog", () => {
  it("uses the domain.action_past grammar (dotted domain, snake_case action)", () => {
    Object.entries(METRIC_NAMES).forEach(([, value]) => {
      // Every catalog value is `<domain>.<snake_case_action>` — a single dot
      // separating a lower_snake domain from a lower_snake action.
      expect(value).toMatch(/^[a-z0-9_]+\.[a-z0-9_]+$/);
    });
  });

  it("names payment (direct send) events", () => {
    expect(METRIC_NAMES.paymentRecipientRecentSelected).toBe(
      "payment.recipient_recent_selected",
    );
    expect(METRIC_NAMES.paymentMaxAmountSelected).toBe(
      "payment.max_amount_selected",
    );
    expect(METRIC_NAMES.paymentFeeBreakdownOpened).toBe(
      "payment.fee_breakdown_opened",
    );
    expect(METRIC_NAMES.paymentTypeSelected).toBe("payment.type_selected");
    expect(METRIC_NAMES.paymentCompleted).toBe("payment.completed");
    expect(METRIC_NAMES.paymentFailed).toBe("payment.failed");
    expect(METRIC_NAMES.paymentSimulationFailed).toBe(
      "payment.simulation_failed",
    );
  });

  it("names swap events (routed/path-payment outcomes settle here too)", () => {
    expect(METRIC_NAMES.swapPickerOpened).toBe("swap.picker_opened");
    expect(METRIC_NAMES.swapSourceSelected).toBe("swap.source_selected");
    expect(METRIC_NAMES.swapDestinationSelected).toBe("swap.destination_selected");
    expect(METRIC_NAMES.swapDirectionToggled).toBe("swap.direction_toggled");
    expect(METRIC_NAMES.swapTrustlineAdded).toBe("swap.trustline_added");
    expect(METRIC_NAMES.swapXlmReserveInsufficientShown).toBe(
      "swap.xlm_reserve_insufficient_shown",
    );
    expect(METRIC_NAMES.swapQuoteExpired).toBe("swap.quote_expired");
    expect(METRIC_NAMES.swapCompleted).toBe("swap.completed");
    expect(METRIC_NAMES.swapFailed).toBe("swap.failed");
  });

  it("names collectible-send and transaction-submission events", () => {
    expect(METRIC_NAMES.collectibleSendCompleted).toBe(
      "collectible_send.completed",
    );
    expect(METRIC_NAMES.collectibleSendFailed).toBe("collectible_send.failed");
    expect(METRIC_NAMES.transactionSubmitted).toBe("transaction.submitted");
  });

  it("names asset / trustline events", () => {
    expect(METRIC_NAMES.assetAdded).toBe("asset.added");
    expect(METRIC_NAMES.assetRemoved).toBe("asset.removed");
    expect(METRIC_NAMES.assetOperationFailed).toBe("asset.operation_failed");
    expect(METRIC_NAMES.assetListModified).toBe("asset_list.modified");
    expect(METRIC_NAMES.assetAddResponded).toBe("asset_add.responded");
    expect(METRIC_NAMES.assetRemoveResponded).toBe("asset_remove.responded");
    expect(METRIC_NAMES.trustlineRemoveFailed).toBe("trustline_remove.failed");
    expect(METRIC_NAMES.assetAddApiCompleted).toBe("asset_add_api.completed");
    expect(METRIC_NAMES.assetAddApiFailed).toBe("asset_add_api.failed");
    expect(METRIC_NAMES.assetAddApiCancelled).toBe("asset_add_api.cancelled");
  });

  it("names onboarding / account / recovery events", () => {
    expect(METRIC_NAMES.onboardingPasswordCreated).toBe(
      "onboarding.password_created",
    );
    expect(METRIC_NAMES.onboardingPasswordCreateFailed).toBe(
      "onboarding.password_create_failed",
    );
    expect(METRIC_NAMES.onboardingRecoveryPhraseConfirmed).toBe(
      "onboarding.recovery_phrase_confirmed",
    );
    expect(METRIC_NAMES.onboardingCompleted).toBe("onboarding.completed");
    expect(METRIC_NAMES.accountRecoveryCompleted).toBe(
      "account_recovery.completed",
    );
    expect(METRIC_NAMES.accountRecoveryFailed).toBe("account_recovery.failed");
    expect(METRIC_NAMES.accountCreated).toBe("account.created");
    expect(METRIC_NAMES.accountImported).toBe("account.imported");
    expect(METRIC_NAMES.accountImportFailed).toBe("account.import_failed");
    expect(METRIC_NAMES.accountFirstFunded).toBe("account.first_funded");
    expect(METRIC_NAMES.accountRenamed).toBe("account.renamed");
  });

  it("names signing / dApp-access events, separating rejection from failure", () => {
    expect(METRIC_NAMES.dappAccessGranted).toBe("dapp_access.granted");
    expect(METRIC_NAMES.dappAccessRejected).toBe("dapp_access.rejected");
    expect(METRIC_NAMES.dappAccessBlocked).toBe("dapp_access.blocked");
    expect(METRIC_NAMES.signingTransactionApproved).toBe(
      "signing.transaction_approved",
    );
    expect(METRIC_NAMES.signingTransactionRejected).toBe(
      "signing.transaction_rejected",
    );
    expect(METRIC_NAMES.signingTransactionBlocked).toBe(
      "signing.transaction_blocked",
    );
    expect(METRIC_NAMES.signingAuthEntryApproved).toBe(
      "signing.auth_entry_approved",
    );
    expect(METRIC_NAMES.signingAuthEntryRejected).toBe(
      "signing.auth_entry_rejected",
    );
    expect(METRIC_NAMES.signingAuthEntryFailed).toBe(
      "signing.auth_entry_failed",
    );
    expect(METRIC_NAMES.signingMessageApproved).toBe("signing.message_approved");
    expect(METRIC_NAMES.signingMessageRejected).toBe("signing.message_rejected");
    expect(METRIC_NAMES.signingMessageFailed).toBe("signing.message_failed");
  });

  it("names blockaid scan events consolidated to completed/failed", () => {
    expect(METRIC_NAMES.blockaidScanCompleted).toBe("blockaid.scan_completed");
    expect(METRIC_NAMES.blockaidScanFailed).toBe("blockaid.scan_failed");
    expect(METRIC_NAMES.blockaidWarningReported).toBe(
      "blockaid.warning_reported",
    );
  });

  it("keeps the foundation events untouched", () => {
    expect(METRIC_NAMES.appOpened).toBe("app.opened");
    expect(METRIC_NAMES.screenViewed).toBe("screen.viewed");
  });

  it("no longer exposes removed / legacy constants", () => {
    const names = METRIC_NAMES as Record<string, string | undefined>;
    // Redundant / duplicate events that were removed outright.
    expect(names.approveSign).toBeUndefined(); // dup of signing.transaction_approved
    expect(names.rejectSigning).toBeUndefined(); // dup of signing.transaction_rejected
    expect(names.reviewedAuthEntry).toBeUndefined();
    expect(names.recoverAccountFinished).toBeUndefined();
    expect(names.backupPhraseSuccess).toBeUndefined();
    expect(names.backupPhraseFail).toBeUndefined();
    expect(names.manageAssetAddToken).toBeUndefined();
    // No value retains the legacy colon-delimited grammar.
    Object.values(METRIC_NAMES).forEach((value) => {
      expect(value).not.toContain(": ");
    });
  });
});
