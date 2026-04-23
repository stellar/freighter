import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Heading, Icon, Text } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";
import { rejectSigningRequest } from "@shared/api/internal";
import { parsedSearchParam } from "helpers/urls";

import "./styles.scss";

export const ConfirmSidebarRequest = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "";

  // Only allow safe, in-extension routes for "next"; fall back to account route.
  const isValidNextRoute = (value: string) => {
    if (!value) {
      return false;
    }
    // Require a single leading "/" (internal path), disallow "//" and any URI scheme.
    if (!value.startsWith("/") || value.startsWith("//")) {
      return false;
    }
    // Disallow strings that look like they start with a URI scheme (e.g., "http:", "javascript:").
    if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(value)) {
      return false;
    }
    return true;
  };

  const safeNext = isValidNextRoute(next) ? next : ROUTES.account;

  const handleReview = () => {
    navigate(safeNext);
  };
  const handleReject = async () => {
    // Extract the UUID from the incoming request's encoded route and reject it
    // via a dedicated handler that cleans up ALL queues (responseQueue,
    // transactionQueue, blobQueue, authEntryQueue, tokenQueue) so the dapp's
    // promise resolves immediately instead of hanging until the TTL fires.
    try {
      const nextRoute = isValidNextRoute(next) ? next : "";
      const queryString = nextRoute.split("?")[1] || "";
      if (queryString) {
        const parsed = parsedSearchParam(queryString);
        if (parsed.uuid) {
          await rejectSigningRequest({ uuid: parsed.uuid });
        }
      }
    } catch {
      // Best-effort — navigate home regardless
    }
    navigate(ROUTES.account);
  };

  return (
    <View.Content>
      <div className="ConfirmSidebarRequest">
        <div className="ConfirmSidebarRequest__header">
          <div className="ConfirmSidebarRequest__icon">
            <Icon.AlertTriangle />
          </div>
          <Heading
            as="h1"
            size="md"
            addlClassName="ConfirmSidebarRequest__title"
          >
            {t("New Signing Request")}
          </Heading>
          <Text as="p" size="sm" addlClassName="ConfirmSidebarRequest__body">
            {t(
              "A new signing request arrived while you were reviewing another. Please review it carefully before approving.",
            )}
          </Text>
        </div>
        <div className="ConfirmSidebarRequest__buttons">
          <Button
            size="md"
            variant="tertiary"
            onClick={handleReject}
            isFullWidth
          >
            {t("Reject")}
          </Button>
          <Button
            size="md"
            variant="secondary"
            onClick={handleReview}
            isFullWidth
          >
            {t("Continue to review")}
          </Button>
        </div>
      </div>
    </View.Content>
  );
};
