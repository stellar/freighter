import React, { createContext, useContext } from "react";
import { Title } from "@stellar/design-system";

import FreighterLogo from "popup/assets/logo-freighter.svg";
import { BackButton } from "popup/basics/buttons/BackButton";
import { addStyleClasses } from "popup/helpers/addStyleClasses";

import "./styles.scss";

interface ViewContextProps {
  isAppLayout?: boolean;
}

const ViewContext = createContext<ViewContextProps>({ isAppLayout: undefined });

// Header
interface ViewHeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showFreighterLogo?: boolean;
  pageTitle?: React.ReactNode;
  pageSubtitle?: React.ReactNode;
  hasBackButton?: boolean;
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
}

const ViewHeader: React.FC<ViewHeaderProps> = ({
  showFreighterLogo,
  leftContent,
  rightContent,
  pageTitle,
  pageSubtitle,
  hasBackButton,
  customBackAction,
  customBackIcon,
}: ViewHeaderProps) => {
  const { isAppLayout } = useContext(ViewContext);

  return (
    <header
      className={`View__header ${
        isAppLayout ? "View__header--tall" : "View__header--border"
      }`}
    >
      <ViewInset isWide={true} isInline={true}>
        {/* Left */}
        <div className="View__header__box View__header__box--left">
          {!isAppLayout || showFreighterLogo ? (
            <img
              className="View__header__logo"
              alt="Freighter logo"
              src={FreighterLogo}
            />
          ) : null}

          {hasBackButton ? (
            <BackButton
              customBackAction={customBackAction}
              customBackIcon={customBackIcon}
            />
          ) : null}

          {leftContent ?? null}
        </div>

        {/* Center */}
        <div>
          <div className="View__header__box View__header__box--center">
            <Title size="md" role="heading" aria-level={2}>
              {pageTitle}
            </Title>
          </div>
          {pageSubtitle ? (
            <div className="View__header__subtitle">{pageSubtitle}</div>
          ) : null}
        </div>

        {/* Right */}
        <div className="View__header__box View__header__box--right">
          {rightContent}
        </div>
      </ViewInset>
    </header>
  );
};

// Content
interface ViewContentProps {
  children: React.ReactNode;
  // TODO: handle other cases: "start", "end"
  alignment?: "center";
}

const ViewContent: React.FC<ViewContentProps> = ({
  children,
  alignment,
}: ViewContentProps) => (
  <div className="View__content">
    <ViewInset alignment={alignment}>{children}</ViewInset>
  </div>
);

// Footer
// TODO: add props
interface ViewFooterProps {}

const ViewFooter: React.FC<ViewFooterProps> = () => (
  <footer className="View__footer">
    <ViewInset isInline={true}>Footer content</ViewInset>
  </footer>
);

// Inset
interface ViewInsetProps {
  children: React.ReactNode;
  // Using wide layout for onboarding and similar views
  isWide?: boolean;
  // Align items inline
  isInline?: boolean;
  // TODO: handle other cases: "start", "end"
  alignment?: "center";
}

export const ViewInset: React.FC<ViewInsetProps> = ({
  children,
  isWide,
  isInline,
  alignment,
}: ViewInsetProps) => (
  <div
    className={`View__inset ${addStyleClasses([
      isWide ? "View__inset--wide" : "",
      isInline ? "View__inset--inline" : "",
      alignment === "center" ? "View__inset--align-center" : "",
    ])}`}
  >
    {children}
  </div>
);

// View
interface ViewComponent {
  Header: React.FC<ViewHeaderProps>;
  Content: React.FC<ViewContentProps>;
  Footer: React.FC<ViewFooterProps>;
  Inset: React.FC<ViewInsetProps>;
}

interface ViewLayoutProps {
  children: React.ReactNode;
  isAppLayout?: boolean;
}

export const View: React.FC<ViewLayoutProps> & ViewComponent = ({
  children,
  // Most views have "app" layout, so defaulting to that
  isAppLayout = true,
}: ViewLayoutProps) => (
  <ViewContext.Provider value={{ isAppLayout }}>
    <div className="View">{children}</div>
  </ViewContext.Provider>
);

View.Header = ViewHeader;
View.Content = ViewContent;
View.Footer = ViewFooter;
View.Inset = ViewInset;
