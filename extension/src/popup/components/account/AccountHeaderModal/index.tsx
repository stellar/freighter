import React, { useEffect, useRef } from "react";

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
}: AccountHeaderModalProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dropdownRef.current != null) {
      dropdownRef.current.style.maxHeight = isDropdownOpen
        ? `calc(100vh - 1rem)`
        : "0";
    }
  }, [isDropdownOpen]);

  return (
    <>
      {icon}
      <div
        ref={dropdownRef}
        className={`AccountHeaderModal ${className || ""}`}
      >
        <div className="AccountHeaderModal__content">{children}</div>
      </div>
    </>
  );
};
