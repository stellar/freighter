import React from "react";

import BlendLogo from "popup/assets/blend-logo.svg";

import "./styles.scss";

/**
 * Protocols the Earn flow can show a pool for. Blend is the only one today, but
 * keying the icon by protocol keeps the call sites from hardcoding its logo.
 */
export type EarnProtocol = "blend";

const PROTOCOL_LOGOS: Record<EarnProtocol, string> = {
  blend: BlendLogo,
};

interface PoolIconProps {
  protocol?: EarnProtocol;
}

/**
 * The pool's protocol mark, shown wherever the flow depicts a pool: the deposit
 * screen's pool card, the pool details sheet, and the review and terminal
 * summaries.
 *
 * Bundled rather than fetched: the Blend catalog carries no icon field, and the
 * only protocol icon URL the app has comes from the Discover `/protocols`
 * response, which this flow never loads. Swap the map for that URL if a pool
 * ever arrives carrying one.
 *
 * `alt` is empty by design — every site pairs this with the pool's name and
 * "by <protocol>", so announcing the logo would only repeat them.
 */
export const PoolIcon = ({ protocol = "blend" }: PoolIconProps) => (
  <img
    className="PoolIcon"
    src={PROTOCOL_LOGOS[protocol]}
    alt=""
    data-testid={`earn-pool-icon-${protocol}`}
  />
);
