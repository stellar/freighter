import React from "react";
import { useTranslation } from "react-i18next";
import { xdr } from "stellar-sdk";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "popup/basics/shadcn/Popover";
import { DisplayToken, scValToDisplayTokens } from "popup/helpers/soroban";

import "./styles.scss";

/** Hover intent: how long a pointer rests on a value before the type appears. */
const OPEN_DELAY = 400;
/** Grace period, so crossing the gap between two values does not flicker. */
const CLOSE_DELAY = 120;
/**
 * After one type has been dismissed, the next appears immediately for this
 * long -- once a signer starts reading types, waiting again is friction.
 */
const SKIP_DELAY = 300;

const TOOLTIP_ID = "ScValTokenType";

/** What Radix measures to place the popover: the value currently pointed at. */
type Anchor = { getBoundingClientRect: () => DOMRect };

const NO_ANCHOR: Anchor = { getBoundingClientRect: () => new DOMRect() };

interface TooltipApi {
  show: (element: HTMLElement, scValType: string, immediate?: boolean) => void;
  hide: () => void;
  toggle: (element: HTMLElement, scValType: string) => void;
}

const ScValTypeTooltipContext = React.createContext<TooltipApi | null>(null);

/**
 * Owns the single type tooltip shared by every value beneath it.
 *
 * One tooltip rather than one per value is what makes moving along a list of
 * values read as one continuous thing: the popover is re-anchored and its text
 * swapped, instead of being torn down and rebuilt at each stop.
 *
 * The API handed down is referentially stable and reads live state from refs,
 * so pointing at a value re-renders this provider alone -- not every value on
 * the screen, which is what made hovering feel heavy.
 */
export const ScValTypeTooltipProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const [active, setActive] = React.useState<{
    element: HTMLElement;
    scValType: string;
  } | null>(null);

  // Radix re-reads this on every render, so re-anchoring is just a setState.
  const anchorRef = React.useRef<Anchor>(NO_ANCHOR);
  anchorRef.current = active?.element ?? NO_ANCHOR;

  const activeRef = React.useRef(active);
  activeRef.current = active;
  const pinnedRef = React.useRef(false);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedAt = React.useRef(0);

  // Set on the element rather than through a prop, so describing the active
  // value does not force a render of every other one.
  React.useEffect(() => {
    const element = active?.element;
    if (!element) {
      return undefined;
    }
    element.setAttribute("aria-describedby", TOOLTIP_ID);
    return () => element.removeAttribute("aria-describedby");
  }, [active]);

  const api = React.useMemo<TooltipApi>(() => {
    const clearTimers = () => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
      }
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    };

    const close = () => {
      clearTimers();
      pinnedRef.current = false;
      setActive(null);
      closedAt.current = Date.now();
    };

    return {
      show: (element, scValType, immediate = false) => {
        clearTimers();
        const next = { element, scValType };
        // Already showing, or shown recently: move it rather than make the
        // signer wait out the delay again.
        if (
          activeRef.current ||
          immediate ||
          Date.now() - closedAt.current < SKIP_DELAY
        ) {
          setActive(next);
          return;
        }
        openTimer.current = setTimeout(() => setActive(next), OPEN_DELAY);
      },

      hide: () => {
        if (openTimer.current) {
          clearTimeout(openTimer.current);
        }
        if (pinnedRef.current) {
          return;
        }
        closeTimer.current = setTimeout(() => {
          setActive(null);
          closedAt.current = Date.now();
        }, CLOSE_DELAY);
      },

      toggle: (element, scValType) => {
        clearTimers();
        if (pinnedRef.current && activeRef.current?.element === element) {
          close();
          return;
        }
        pinnedRef.current = true;
        setActive({ element, scValType });
      },
    };
  }, []);

  React.useEffect(
    () => () => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
      }
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  return (
    <ScValTypeTooltipContext.Provider value={api}>
      {children}
      <Popover
        open={Boolean(active)}
        onOpenChange={(next) => {
          if (!next) {
            pinnedRef.current = false;
            setActive(null);
            closedAt.current = Date.now();
          }
        }}
      >
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          id={TOOLTIP_ID}
          className="ScValTokenType"
          sideOffset={6}
          // A hint, not a dialog: it must not take focus or swallow the
          // pointer on its way to the next value.
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <span className="ScValTokenType__label">{t("Type")}</span>
          <span className="ScValTokenType__value" data-testid="ScValTokenType">
            {active ? active.scValType : ""}
          </span>
        </PopoverContent>
      </Popover>
    </ScValTypeTooltipContext.Provider>
  );
};

/** One scalar of a rendered `SCVal`, showing the arm it was signed as. */
const ScValToken = React.memo(
  ({
    text,
    scValType,
    tooltip,
  }: {
    text: string;
    scValType: string;
    tooltip: TooltipApi;
  }) => {
    const ref = React.useRef<HTMLButtonElement>(null);

    const show = (immediate = false) => {
      if (ref.current) {
        tooltip.show(ref.current, scValType, immediate);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        className="ScValToken"
        data-testid="ScValToken"
        data-scval-type={scValType}
        onPointerEnter={() => show()}
        onPointerLeave={() => tooltip.hide()}
        // Reaching a value by keyboard is already deliberate, so no delay.
        onFocus={() => show(true)}
        onBlur={() => tooltip.hide()}
        onClick={(event) => {
          // The whole parameter block is a click-to-copy target and SDS
          // `CopyText` chains handlers rather than swallowing them, so without
          // this, inspecting a value would also copy it.
          event.stopPropagation();
          if (ref.current) {
            tooltip.toggle(ref.current, scValType);
          }
        }}
      >
        {text}
      </button>
    );
  },
);

ScValToken.displayName = "ScValToken";

/**
 * Renders a signed `SCVal`, adding the ability to inspect each scalar's type
 * without changing a character of what is rendered.
 *
 * The type is deliberately not spelled out inline. A Soroban struct is a
 * symbol-keyed map, so prefixing each entry with its type would bury the data
 * the signer is there to read; `{ amount: 100 }` stays `{ amount: 100 }`.
 *
 * The text and the clipboard string come from the same token stream
 * (`scValToDisplayTokens`), so what is shown and what is copied cannot drift.
 */
export const ScValDisplay = ({ scVal }: { scVal: xdr.ScVal }) => {
  const tooltip = React.useContext(ScValTypeTooltipContext);

  const tokens = (
    <>
      {scValToDisplayTokens(scVal).map((token: DisplayToken, index: number) => {
        const key = `${index}-${token.text}`;

        return token.kind === "punct" || !tooltip ? (
          <React.Fragment key={key}>{token.text}</React.Fragment>
        ) : (
          <ScValToken
            key={key}
            text={token.text}
            scValType={token.scValType}
            tooltip={tooltip}
          />
        );
      })}
    </>
  );

  // Standalone use still gets a tooltip; the provider above just lets every
  // argument on the screen share one.
  return tooltip ? (
    tokens
  ) : (
    <ScValTypeTooltipProvider>{tokens}</ScValTypeTooltipProvider>
  );
};
