import React from "react";
import { render, screen } from "@testing-library/react";

import { TransactionStatus } from "popup/components/TransactionStatus";

const renderStatus = (isPending: boolean) =>
  render(
    <TransactionStatus
      isPending={isPending}
      title={isPending ? "Swap in progress" : "Swap complete"}
      fromIcon={<span data-testid="from-icon" />}
      toIcon={<span data-testid="to-icon" />}
      amount="100 XLM"
      verb={isPending ? "to" : "was swapped for"}
      target="149.99 USDC"
      captionTestId="status-caption"
    />,
  );

describe("TransactionStatus", () => {
  it("shows a spinner over the title while pending", () => {
    const { container } = renderStatus(true);

    expect(screen.getByText("Swap in progress")).toBeInTheDocument();
    expect(container.querySelector(".Loader")).toBeInTheDocument();
    expect(
      container.querySelector(".TransactionStatus__check"),
    ).not.toBeInTheDocument();
  });

  it("shows a check over the title once done", () => {
    const { container } = renderStatus(false);

    expect(screen.getByText("Swap complete")).toBeInTheDocument();
    expect(
      container.querySelector(".TransactionStatus__check"),
    ).toBeInTheDocument();
    expect(container.querySelector(".Loader")).not.toBeInTheDocument();
  });

  it("puts one arrow between the two icons, and the caption under them", () => {
    const { container } = renderStatus(false);

    const icons = container.querySelector(".TransactionStatus__icons")!;
    expect(Array.from(icons.children).map((el) => el.tagName)).toEqual([
      "SPAN",
      "svg",
      "SPAN",
    ]);
    expect(icons.querySelector(".TransactionStatus__arrow")).not.toBeNull();
    expect(screen.getByTestId("status-caption")).toHaveTextContent(
      "100 XLM was swapped for 149.99 USDC",
    );
  });
});
