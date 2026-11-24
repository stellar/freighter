import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { SwapToFooter } from "popup/components/account/AssetDetail/SwapToFooter";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { code?: string }) =>
      opts?.code ? key.replace("{{code}}", opts.code) : key,
  }),
}));

describe("SwapToFooter", () => {
  it("renders one Swap to button for an unflagged token", () => {
    const onSelect = jest.fn();
    render(
      <SwapToFooter
        code="USDC"
        side="to"
        onSelect={onSelect}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("asset-detail-swap-to-cancel")).toBeNull();
    fireEvent.click(screen.getByTestId("asset-detail-swap-to-button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["malicious", { isMalicious: true }, "error"],
    ["suspicious", { isSuspicious: true }, "default"],
  ])(
    "renders Cancel and Swap to anyway for a %s token",
    (_name, flags, tone) => {
      const onSelect = jest.fn();
      const onCancel = jest.fn();
      render(
        <SwapToFooter
          code="SHX"
          side="to"
          onSelect={onSelect}
          onCancel={onCancel}
          {...flags}
        />,
      );

      expect(screen.queryByTestId("asset-detail-swap-to-button")).toBeNull();
      const anyway = screen.getByTestId("asset-detail-swap-to-anyway");
      expect(anyway).toHaveTextContent("Swap to SHX anyway");
      expect(anyway.className).toContain(
        `AssetDetail__swap-to-anyway--${tone}`,
      );

      fireEvent.click(screen.getByTestId("asset-detail-swap-to-cancel"));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
      fireEvent.click(anyway);
      expect(onSelect).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps the plain button on the source side even for a flagged token", () => {
    render(
      <SwapToFooter
        code="SHX"
        side="from"
        isMalicious
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByTestId("asset-detail-swap-to-button")).toHaveTextContent(
      "Swap from SHX",
    );
    expect(screen.queryByTestId("asset-detail-swap-to-anyway")).toBeNull();
  });
});
