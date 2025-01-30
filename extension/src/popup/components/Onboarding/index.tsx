import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Heading, Card } from "@stellar/design-system";

import { BackButton } from "popup/basics/buttons/BackButton";
import { Box } from "popup/basics/layout/Box";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

interface OnboardingProps {
  children: React.ReactNode;
  layout: "half" | "full";
  customWidth?: string;
}

export const Onboarding = ({
  children,
  layout,
  customWidth,
}: OnboardingProps) => {
  const customStyle = {
    ...(!customWidth && layout === "full"
      ? // eslint-disable-next-line
        { "--Onboarding-layout-width": "100%" }
      : {}),
    // eslint-disable-next-line
    ...(customWidth ? { "--Onboarding-layout-width": customWidth } : {}),
  } as React.CSSProperties;

  return (
    <div className="Onboarding" style={customStyle}>
      <>{children}</>
    </div>
  );
};

export const OnboardingOneCol = ({
  children,
  ...props
}: {
  children: React.ReactElement | React.ReactElement[];
}) => (
  <Box display="flex" gridCellWidth="24rem" gapVertical="2rem" {...props}>
    {children}
  </Box>
);

interface OnboardingButtonsProps {
  hasGoBackBtn?: boolean;
  customBackAction?: () => void;
  children?: React.ReactElement;
}

export const OnboardingButtons = ({
  hasGoBackBtn,
  customBackAction,
  children,
}: OnboardingButtonsProps) => {
  const { t } = useTranslation();

  const isNewTabSession = window.history.length === 1;
  const showBackButton = hasGoBackBtn && !isNewTabSession;

  if (children || showBackButton) {
    return (
      <Box display="flex" isFlexRow gapHorizontal=".75rem">
        <>
          {showBackButton ? (
            <BackButton
              customButtonComponent={
                <Button variant="tertiary" size="lg" type="button">
                  {t("Back")}
                </Button>
              }
              customBackAction={customBackAction}
            />
          ) : null}

          {children}
        </>
      </Box>
    );
  }

  return null;
};

interface OnboardingModalProps {
  children: React.ReactNode;
  headerText: string;
  bodyText: React.ReactNode;
}

export const OnboardingModal = ({
  children,
  headerText,
  bodyText,
}: OnboardingModalProps) => (
  <View.Content alignment="center" hasNoTopPadding hasNoBottomPadding>
    <div className="Onboarding__card__wrapper">
      <Card variant="secondary">
        <div className="Onboarding__card">
          <Heading as="h2" size="xs" weight="semi-bold">
            {headerText}
          </Heading>
          <div className="Onboarding__card__text">{bodyText}</div>
        </div>
        {children}
      </Card>
    </div>
  </View.Content>
);

export const OnboardingError = ({ errorString }: { errorString: string }) => (
  <View.Content hasNoTopPadding>
    <div className="Onboarding__error">
      {errorString ? (
        <Alert placement="inline" variant="error">
          {errorString}
        </Alert>
      ) : null}
    </div>
  </View.Content>
);
