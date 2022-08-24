import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface ListNavLinkProps {
  children: string | React.ReactNode;
  href: string | ROUTES;
  searchParams?: string;
}

export const ListNavLink = ({
  children,
  href,
  searchParams = "",
}: ListNavLinkProps) => {
  const fullHref = `${href}${searchParams}`;

  return (
    <div className="ListNavLink">
      {Object.values(ROUTES).includes(href as ROUTES) ? (
        <Link to={fullHref}>
          {children} <Icon.ChevronRight className="ListNavLink__icon" />
        </Link>
      ) : (
        <a rel="noreferrer" target="_blank" href={fullHref}>
          {children} <Icon.ChevronRight className="ListNavLink__icon" />
        </a>
      )}
    </div>
  );
};

export const ListNavLinkWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => <div className="ListNavLink__wrapper">{children}</div>;
