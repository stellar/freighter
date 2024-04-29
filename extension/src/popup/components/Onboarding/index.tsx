import React from "react";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Heading } from "@stellar/design-system";

import { BackButton } from "popup/basics/buttons/BackButton";
import { Box } from "popup/basics/layout/Box";

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

interface OnboardingHeaderProps {
  children: React.ReactNode;
}

export const OnboardingHeader = ({ children }: OnboardingHeaderProps) => (
  <Heading as="h1" size="lg">
    {children}
  </Heading>
);

export const OnboardingOneCol = ({
  children,
  ...props
}: {
  children: React.ReactElement | React.ReactElement[];
}) => (
  <Box display="flex" gridCellWidth="24rem" gapVertical="1.5rem" {...props}>
    {children}
  </Box>
);

export const OnboardingTwoCol = ({
  children,
  ...props
}: {
  children: React.ReactElement | React.ReactElement[];
}) => (
  <Box
    display="grid"
    gridCellWidth="24rem"
    gapVertical="1.5rem"
    gapHorizontal="2rem"
    {...props}
  >
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
  const history = useHistory();
  const { t } = useTranslation();

  const isNewTabSession = history.length === 1;
  const showBackButton = hasGoBackBtn && !isNewTabSession;

  if (children || showBackButton) {
    return (
      <Box display="flex" isFlexRow gapHorizontal="1rem">
        <>
          {showBackButton ? (
            <BackButton
              customButtonComponent={
                <Button variant="secondary" size="md" type="button">
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
