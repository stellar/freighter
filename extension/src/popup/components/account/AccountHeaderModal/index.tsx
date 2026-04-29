import React from "react";

import "./styles.scss";

interface AccountHeaderModalProps {
  children: React.ReactElement;
  isDropdownOpen: boolean;
  icon: React.ReactNode;
  className?: string;
}

export const AccountHeaderModal = ({
  children,
  isDropdownOpen,
  icon,
  className,
}: AccountHeaderModalProps) => (
  <>
    {icon}
    <div
      className={`AccountHeaderModal ${isDropdownOpen ? "AccountHeaderModal--open" : ""} ${className || ""}`}
    >
      <div className="AccountHeaderModal__content">{children}</div>
    </div>
  </>
);
