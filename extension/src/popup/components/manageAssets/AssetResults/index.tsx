import React from "react";
import { Icon, Input, Loader } from "@stellar/design-system";

import "./styles.scss";

interface SearchInputProps {
  id: string;
  placeholder: string;
}

export const SearchInput = ({
  id,
  placeholder,
  ...props
}: SearchInputProps) => (
  <div className="SearchInput">
    <Input
      fieldSize="md"
      autoFocus
      autoComplete="off"
      id={id}
      rightElement={<Icon.Search />}
      placeholder={placeholder}
      {...props}
    />
  </div>
);

export const SearchCopy = ({ children }: { children: React.ReactNode }) => (
  <div className="SearchCopy">{children}</div>
);

interface SearchResultsProps {
  isSearching: boolean;
  resultsRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}

export const SearchResults = ({
  isSearching,
  resultsRef,
  children,
}: SearchResultsProps) => (
  <div className="SearchResults">
    <div ref={resultsRef}>
      {isSearching ? (
        <div className="SearchResults__loader">
          <Loader />
        </div>
      ) : null}

      {children}
    </div>
  </div>
);
