import React from "react";

import "./styles.scss";

export interface InfoRow {
  label: string;
  value: string;
  /** Kept stable per consumer — these ids are asserted by existing tests. */
  testId: string;
}

interface InfoRowCardProps {
  /** Section icon, rendered beside the title. */
  icon: React.ReactNode;
  title: string;
  /** Rendered in order, divider-separated. Callers omit rows they can't fill
   * rather than passing an empty value. */
  rows: InfoRow[];
  /** Test id for the section wrapper, e.g. "TokenStats" or "AssetAbout". */
  testId: string;
}

/** Presentational label/value card shared by Token Stats and About. */
export const InfoRowCard = ({
  icon,
  title,
  rows,
  testId,
}: InfoRowCardProps) => (
  <div className="InfoRowCard" data-testid={testId}>
    <div className="InfoRowCard__header">
      {icon}
      {title}
    </div>
    <div className="InfoRowCard__card">
      {rows.map((row, i) => (
        <React.Fragment key={row.testId}>
          {i > 0 ? <div className="InfoRowCard__divider" /> : null}
          <div className="InfoRowCard__row" data-testid={row.testId}>
            <div className="InfoRowCard__row__label">{row.label}</div>
            <div className="InfoRowCard__row__value">{row.value}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>
);
