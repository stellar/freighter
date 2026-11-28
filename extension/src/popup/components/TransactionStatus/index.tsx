import React from "react";
import { Icon, Loader } from "@stellar/design-system";

import "./styles.scss";

interface TransactionStatusProps {
  /** Still submitting: a spinner over the title. Otherwise, a green check. */
  isPending: boolean;
  title: string;
  /** What leaves the account and where it goes, either side of the arrow. */
  fromIcon: React.ReactNode;
  toIcon: React.ReactNode;
  /** The caption reads `amount`, then `verb` in secondary, then `target`. */
  amount: string;
  verb: string;
  target: string;
  captionTestId?: string;
}

/**
 * A submit screen's status and summary, as Varial draws it for Swap
 * (1523:157348, 1523:157365), the swap inside Earn (4478:117063, 4478:117082)
 * and the Earn deposit (4470:111555, 4470:111569): a 28px spinner or check over
 * the title, then a card with the two icons either side of an arrow and the
 * caption under them. The host screen places it and owns the buttons.
 */
export const TransactionStatus = ({
  isPending,
  title,
  fromIcon,
  toIcon,
  amount,
  verb,
  target,
  captionTestId,
}: TransactionStatusProps) => (
  <div className="TransactionStatus">
    <div className="TransactionStatus__title">
      {isPending ? (
        <Loader size="1.75rem" />
      ) : (
        <Icon.CheckCircle className="TransactionStatus__check" />
      )}
      <span>{title}</span>
    </div>

    <div className="TransactionStatus__summary">
      <div className="TransactionStatus__icons">
        {fromIcon}
        <Icon.ArrowRight className="TransactionStatus__arrow" />
        {toIcon}
      </div>
      <div className="TransactionStatus__caption" data-testid={captionTestId}>
        <span>{amount}</span>
        <span className="TransactionStatus__caption-verb">{` ${verb} `}</span>
        <span>{target}</span>
      </div>
    </div>
  </div>
);
