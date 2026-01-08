import { captureException } from "@sentry/browser";
import { View } from "popup/basics/layout/View";
import React, { Component } from "react";
import { useTranslation } from "react-i18next";
import i18n from "popup/helpers/localizationConfig";

import IconFail from "popup/assets/icon-fail.svg";
import { Button } from "@stellar/design-system";

import "./styles.scss";

export class ErrorBoundary extends Component<
  React.PropsWithChildren,
  { hasError: boolean; errorString: string }
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  constructor(props: React.PropsWithChildren) {
    super(props);

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
          errorMessage={i18n.t("An unexpected error has occurred")}
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
  return (
    <div className="UnexpectedError">
      <View.AppHeader pageTitle={t("Error")} />
      <View.Content>
        <div className="UnexpectedError__content">
          <div className="UnexpectedError__amount">{t("Unexpected Error")}</div>
          <div className="UnexpectedError__icon UnexpectedError__fail">
            <img src={IconFail} alt={t("Icon Fail")} />
          </div>
        </div>
        <div className="UnexpectedError__error-block">{t(errorMessage)}</div>
        <div className="UnexpectedError__error-string">{errorString}</div>
      </View.Content>
      <View.Footer>
        <Button
          isFullWidth
          variant="tertiary"
          size="md"
          onClick={() => {
            // https://stackoverflow.com/questions/57854/how-can-i-close-a-browser-window-without-receiving-the-do-you-want-to-close-thi
            window.open("", "_self", "");
            window.close();
          }}
        >
          {t("Close")}
        </Button>
      </View.Footer>
    </div>
  );
};
