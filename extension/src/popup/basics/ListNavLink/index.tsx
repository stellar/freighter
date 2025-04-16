import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface ListNavLinkProps {
  children: string | React.ReactNode;
  href: string | ROUTES;
  searchParams?: string;
  icon?: React.ReactNode;
  isExternal?: boolean;
}

const renderListNavLinkIcon = (icon: React.ReactNode) => (
  <div className="ListNavLink__icon">{icon}</div>
);

export const ListNavLink = ({
  children,
  href,
  searchParams = "",
  icon,
  isExternal = false,
}: ListNavLinkProps) => {
  const fullHref = `${href}${searchParams}`;
  return (
    <div className="ListNavLink">
      {icon ? renderListNavLinkIcon(icon) : null}
      {Object.values(ROUTES).includes(href as ROUTES) ? (
        <Link to={fullHref}>
          {children} <Icon.ChevronRight className="ListNavLink__arrow" />
        </Link>
      ) : (
        <a rel="noreferrer" target="_blank" href={fullHref}>
          {children}{" "}
          {isExternal ? (
            <Icon.LinkExternal01 className="ListNavLink__arrow" />
          ) : (
            <Icon.ChevronRight className="ListNavLink__arrow" />
          )}
        </a>
      )}
    </div>
  );
};

interface ListNavButtonLinkProps {
  children: string | React.ReactNode;
  handleClick: () => void;
}

export const ListNavButtonLink = ({
  children,
  handleClick,
}: ListNavButtonLinkProps) => (
  <div className="ListNavLink">
    <span
      onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}
    >
      {children} <Icon.ChevronRight className="ListNavLink__arrow" />
    </span>
  </div>
);

export const ListNavLinkWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => <div className="ListNavLink__wrapper">{children}</div>;
