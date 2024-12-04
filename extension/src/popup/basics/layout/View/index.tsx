import React, { createContext, useContext } from "react";
import { Text } from "@stellar/design-system";

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
  showFreighterLogo?: boolean;
  showBottomBorder?: boolean;
}

const ViewHeader: React.FC<ViewHeaderProps> = ({
  showFreighterLogo = true,
  showBottomBorder = true,
  ...props
}: ViewHeaderProps) => (
  <header
    className={`View__header ${addStyleClasses([
      showBottomBorder ? "View__header--border" : "",
    ])}`}
    {...props}
  >
    <ViewInset isWide={true} isInline={true}>
      <div className="View__header__box View__header__box--left">
        {showFreighterLogo ? (
          <img
            className="View__header__logo"
            alt="Freighter logo"
            src={FreighterLogo}
          />
        ) : null}
      </div>
    </ViewInset>
  </header>
);

// App header
interface ViewAppHeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  pageTitle?: React.ReactNode;
  pageSubtitle?: React.ReactNode;
  hasBackButton?: boolean;
  customBackAction?: () => void;
  customBackIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const ViewAppHeader: React.FC<ViewAppHeaderProps> = ({
  leftContent,
  rightContent,
  centerContent,
  pageTitle,
  pageSubtitle,
  hasBackButton,
  customBackAction,
  customBackIcon,
  children,
  ...props
}: ViewAppHeaderProps) => (
  <div className="View__header View__header--tall" {...props}>
    <ViewInset isInline={true} hasVerticalBorder>
      {/* Left */}
      <div className="View__header__box View__header__box--left">
        {hasBackButton ? (
          <BackButton
            customBackAction={customBackAction}
            customBackIcon={customBackIcon}
          />
        ) : null}

        {leftContent ?? null}
      </div>

      {/* Center */}
      {centerContent ? (
        <div className="View__header__box View__header__box--center">
          {centerContent}
        </div>
      ) : (
        <div>
          <div className="View__header__box View__header__box--center">
            <Text
              as="h2"
              size="md"
              role="heading"
              aria-level={2}
              data-testid="AppHeaderPageTitle"
            >
              {pageTitle}
            </Text>
          </div>
          {pageSubtitle ? (
            <div
              className="View__header__subtitle"
              data-testid="AppHeaderPageSubtitle"
            >
              {pageSubtitle}
            </div>
          ) : null}
        </div>
      )}

      {/* Right */}
      <div className="View__header__box View__header__box--right">
        {rightContent}
      </div>
    </ViewInset>

    {children}
  </div>
);

// Content
interface ViewContentProps {
  children: React.ReactNode;
  // TODO: handle other cases: "start", "end"
  alignment?: "center";
  contentFooter?: React.ReactNode;
  hasNoTopPadding?: boolean;
  hasNoBottomPadding?: boolean;
}

const ViewContent: React.FC<ViewContentProps> = ({
  children,
  alignment,
  contentFooter,
  hasNoTopPadding,
  hasNoBottomPadding,
  ...props
}: ViewContentProps) => {
  const { isAppLayout } = useContext(ViewContext);

  return (
    <div className="View__content" {...props}>
      <ViewInset
        alignment={alignment}
        hasVerticalBorder={isAppLayout}
        hasNoTopPadding={hasNoTopPadding}
        hasNoBottomPadding={hasNoBottomPadding}
        hasScrollShadow
      >
        {children}
      </ViewInset>
      {contentFooter ? (
        <ViewInset
          alignment={alignment}
          hasVerticalBorder={isAppLayout}
          additionalClassName="View__inset__footer"
        >
          {contentFooter}
        </ViewInset>
      ) : null}
    </div>
  );
};

// Footer
interface ViewFooterProps {
  children: React.ReactNode;
  customHeight?: string;
  customGap?: string;
  hasExtraPaddingBottom?: boolean;
  hasTopBorder?: boolean;
  isInline?: boolean;
  allowWrap?: boolean;
  style?: React.CSSProperties;
}

const ViewFooter: React.FC<ViewFooterProps> = ({
  children,
  customHeight,
  customGap,
  hasExtraPaddingBottom,
  hasTopBorder,
  isInline,
  allowWrap,
  style,
  ...props
}: ViewFooterProps) => {
  const customStyle = {
    // eslint-disable-next-line
    ...(customHeight ? { "--View-footer-height": customHeight } : {}),
    ...(hasExtraPaddingBottom
      ? // eslint-disable-next-line
        { "--View-footer-padding-bottom": "1.5rem" }
      : {}),
    // eslint-disable-next-line
    ...(customGap ? { "--View-footer-gap": customGap } : {}),
  } as React.CSSProperties;

  return (
    <footer
      className={`View__footer ${addStyleClasses([
        allowWrap ? "View__footer--wrap" : "",
      ])}`}
      style={{ ...style, ...customStyle }}
      {...props}
    >
      <ViewInset
        hasVerticalBorder
        hasTopBorder={hasTopBorder}
        isInline={isInline}
      >
        {children}
      </ViewInset>
    </footer>
  );
};

// Inset
interface ViewInsetProps {
  children: React.ReactNode;
  // Using wide layout for onboarding and similar views
  isWide?: boolean;
  // Align items inline
  isInline?: boolean;
  // TODO: handle other cases: "start", "end"
  alignment?: "center";
  hasVerticalBorder?: boolean;
  hasTopBorder?: boolean;
  additionalClassName?: string;
  hasScrollShadow?: boolean;
  hasNoTopPadding?: boolean;
  hasNoBottomPadding?: boolean;
}

export const ViewInset: React.FC<ViewInsetProps> = ({
  children,
  isWide,
  isInline,
  alignment,
  hasVerticalBorder,
  hasTopBorder,
  additionalClassName,
  hasScrollShadow,
  hasNoTopPadding,
  hasNoBottomPadding,
  ...props
}: ViewInsetProps) => (
  <div
    className={`View__inset ${addStyleClasses([
      isWide ? "View__inset--wide" : "",
      isInline ? "View__inset--inline" : "",
      alignment === "center" ? "View__inset--align-center" : "",
      hasVerticalBorder ? "View__inset--vertical-border" : "",
      hasTopBorder ? "View__inset--top-border" : "",
      hasScrollShadow ? "View__inset--scroll-shadows" : "",
      hasNoTopPadding ? "View__inset--no-top-padding" : "",
      hasNoBottomPadding ? "View__inset--no-bottom-padding" : "",
    ])}${additionalClassName ? ` ${additionalClassName}` : ""}`}
    {...props}
  >
    {children}
  </div>
);

// View
interface ViewComponent {
  Header: React.FC<ViewHeaderProps>;
  AppHeader: React.FC<ViewAppHeaderProps>;
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
  ...props
}: ViewLayoutProps) => (
  <ViewContext.Provider value={{ isAppLayout }}>
    <div className="View" {...props}>
      {children}
    </div>
  </ViewContext.Provider>
);

View.Header = ViewHeader;
View.AppHeader = ViewAppHeader;
View.Content = ViewContent;
View.Footer = ViewFooter;
View.Inset = ViewInset;
