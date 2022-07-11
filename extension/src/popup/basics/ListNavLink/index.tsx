import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface ListNavLinkProps {
  children: string | React.ReactNode;
  href: string | ROUTES;
}

export const ListNavLink = ({ children, href }: ListNavLinkProps) => (
  <div className="ListNavLink">
    {Object.values(ROUTES).includes(href as ROUTES) ? (
      <Link to={href}>
        {children} <Icon.ChevronRight className="ListNavLink__icon" />
      </Link>
    ) : (
      <a rel="noreferrer" target="_blank" href={href}>
        {children} <Icon.ChevronRight className="ListNavLink__icon" />
      </a>
    )}
  </div>
);

export const ListNavLinkWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => <div className="ListNavLink__wrapper">{children}</div>;
