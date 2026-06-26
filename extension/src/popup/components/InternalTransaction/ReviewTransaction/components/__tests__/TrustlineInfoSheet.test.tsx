import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { TrustlineInfoSheet } from "../TrustlineInfoSheet";

// Local i18n mock that interpolates {{vars}} and renders <Trans> with its named
// components, so the inline-bold body copy can be asserted (the global setup
// mock renders <Trans> as empty for non-string children).
jest.mock("react-i18next", () => {
  const ReactLib = require("react");
  const interpolate = (str: string, values: Record<string, unknown> = {}) =>
    Object.keys(values).reduce(
      (acc, key) => acc.split(`{{${key}}}`).join(String(values[key])),
      str,
    );
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) =>
        interpolate(key, opts),
      i18n: { changeLanguage: () => Promise.resolve(), t: (k: string) => k },
    }),
    Trans: ({
      i18nKey,
      values,
      components,
    }: {
      i18nKey: string;
      values?: Record<string, unknown>;
      components: Record<string, React.ReactElement>;
    }) => {
      const text = interpolate(i18nKey, values);
      const parts = text.split(/<bold>(.*?)<\/bold>/);
      return ReactLib.createElement(
        ReactLib.Fragment,
        null,
        parts.map((part: string, i: number) =>
          i % 2 === 1
            ? ReactLib.cloneElement(components.bold, { key: String(i) }, part)
            : part,
        ),
      );
    },
    initReactI18next: { type: "3rdParty", init: () => {} },
  };
});

describe("TrustlineInfoSheet", () => {
  it("renders the info sheet", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet isOpen tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    expect(screen.getByTestId("trustline-info-sheet")).toBeInTheDocument();
    expect(
      screen.getByText("This will add a trustline to USDC"),
    ).toBeInTheDocument();
  });

  it("renders the reserve explanation with the reserve amount emphasized", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet isOpen tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    // Body copy is token-specific and present.
    expect(screen.getByText(/To hold USDC in your wallet/)).toBeInTheDocument();
    // The reserve amount renders as inline bold (a <strong> element).
    const emphasized = screen.getByText("0.5 XLM will be reserved");
    expect(emphasized.tagName).toBe("STRONG");
  });

  it("fires onClose when the close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet isOpen tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("trustline-info-sheet-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
