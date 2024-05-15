import { captureException } from "@sentry/browser";
import { View } from "popup/basics/layout/View";
import React, { Component } from "react";
import { useTranslation } from "react-i18next";

import IconFail from "popup/assets/icon-fail.svg";
import { Button } from "@stellar/design-system";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

export class ErrorBoundary extends Component<
  React.PropsWithChildren,
  { hasError: boolean; errorString: string }
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  constructor(props: React.PropsWithChildren) {
    super(props);
    // eslint-disable-next-line
    this.state = { hasError: false, errorString: "" };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ errorString: error.toString() });
    captureException(info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <UnhandledError
          errorMessage="An unexpected error has occurred"
          errorString={this.state.errorString}
        />
      );
    }
    return this.props.children;
  }
}

export const UnhandledError = ({
  errorMessage,
  errorString,
}: {
  errorMessage: string;
  errorString: string;
}) => {
  const { t } = useTranslation();
  // expected to work outside of <Router />
  const isOnAccount = window.location.hash === "#/account";
  return (
    <React.Fragment>
      <View.AppHeader pageTitle={t("Error")} />
      <View.Content>
        <div className="UnexpectedError__content">
          <div className="UnexpectedError__amount">Unexpected Error</div>
          <div className="UnexpectedError__icon UnexpectedError__fail">
            <img src={IconFail} alt="Icon Fail" />
          </div>
        </div>
        <div className="UnexpectedError__error-block">{errorMessage}</div>
        <div className="UnexpectedError__error-string">{errorString}</div>
      </View.Content>
      <View.Footer>
        {isOnAccount ? (
          <Button
            isFullWidth
            variant="secondary"
            size="md"
            onClick={window.close}
          >
            {t("Close")}
          </Button>
        ) : (
          <Button
            isFullWidth
            variant="secondary"
            size="md"
            onClick={() => {
              navigateTo(ROUTES.account);
            }}
          >
            {t("Got it")}
          </Button>
        )}
      </View.Footer>
    </React.Fragment>
  );
};
