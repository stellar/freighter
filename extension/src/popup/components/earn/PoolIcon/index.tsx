import React from "react";

import BlendIcon from "popup/assets/blend-icon.png";

import "./styles.scss";

/**
 * Protocols the Earn flow can show a pool for. Blend is the only one today, but
 * keying the icon by protocol keeps the call sites from hardcoding its logo.
 */
export type EarnProtocol = "blend";

const PROTOCOL_LOGOS: Record<EarnProtocol, string> = {
  blend: BlendIcon,
};

interface PoolIconProps {
  protocol?: EarnProtocol;
  /** Rendered size in px; the design draws the mark at 16, 32 and 40. */
  size?: number;
}

/**
 * The pool's protocol mark, shown wherever the flow depicts a pool: the token
 * picker's "Deposit into" chip, the deposit screen's pool card, the pool details
 * sheet, and the review, terminal and deposit-details summaries. The intro keeps
 * Blend's flat mark (blend-logo.svg); everywhere else the design uses this
 * illustrated jar, the same file mobile ships.
 *
 * Bundled rather than fetched: the Blend catalog carries no icon field, and the
 * only protocol icon URL the app has comes from the Discover `/protocols`
 * response, which this flow never loads. Swap the map for that URL if a pool
 * ever arrives carrying one.
 *
 * `alt` is empty by design — every site pairs this with the pool's name and
 * "by <protocol>", so announcing the logo would only repeat them.
 */
export const PoolIcon = ({ protocol = "blend", size = 32 }: PoolIconProps) => (
  <img
    className="PoolIcon"
    src={PROTOCOL_LOGOS[protocol]}
    alt=""
    width={size}
    height={size}
    data-testid={`earn-pool-icon-${protocol}`}
  />
);
