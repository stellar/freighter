import React from "react";
import { useHistory } from "react-router-dom";

import { BackButton } from "popup/basics/buttons/BackButton";

import "./styles.scss";

export const Onboarding = ({
  customBackAction,
  hasGoBackBtn,
  children,
}: {
  customBackAction?: () => void;
  hasGoBackBtn?: boolean;
  children: React.ReactNode;
}) => {
  const history = useHistory();
  const isNewTabSession = history.length === 1;

  return (
    <div className="Onboarding">
      {hasGoBackBtn && !isNewTabSession ? (
        <div className="Onboarding--back">
          <BackButton customBackAction={customBackAction} hasBackCopy />
        </div>
      ) : null}
      {children}
    </div>
  );
};

interface OnboardingHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const OnboardingHeader = ({
  className,
  children,
  ...props
}: OnboardingHeaderProps) => (
  <header className={`OnboardingHeader ${className}`} {...props}>
    {children}
  </header>
);

interface OnboardingScreenProps {
  className?: string;
  children: React.ReactNode;
}

export const OnboardingScreen = ({
  className,
  children,
  ...props
}: OnboardingScreenProps) => (
  <div className={`OnboardingScreen ${className}`} {...props}>
    {children}
  </div>
);

interface OnboardingHalfScreenProps {
  className?: string;
  children: React.ReactNode;
}

export const OnboardingHalfScreen = ({
  className,
  children,
  ...props
}: OnboardingHalfScreenProps) => (
  <div className={`OnboardingHalfScreen ${className}`} {...props}>
    {children}
  </div>
);
