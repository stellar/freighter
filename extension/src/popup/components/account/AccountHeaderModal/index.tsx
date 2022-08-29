import React, { useEffect, useRef } from "react";

import "./styles.scss";

interface AccountHeaderModalProps {
  children: React.ReactElement;
  isDropdownOpen: boolean;
  maxHeight: number;
}

export const AccountHeaderModal = ({
  children,
  isDropdownOpen,
  maxHeight,
}: AccountHeaderModalProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dropdownRef.current != null) {
      dropdownRef.current.style.maxHeight = isDropdownOpen
        ? `${maxHeight}rem`
        : "0";
    }
  }, [maxHeight, isDropdownOpen]);

  return (
    <div ref={dropdownRef} className="AccountHeaderModal">
      {children}
    </div>
  );
};
