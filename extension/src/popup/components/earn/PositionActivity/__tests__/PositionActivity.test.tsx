import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { PositionActivity } from "popup/components/earn/PositionActivity";
import {
  PositionActivityItem,
  PositionActivityType,
} from "popup/components/earn/helpers/positionActivity";
import { usePositionActivity } from "popup/components/earn/PositionActivity/hooks/usePositionActivity";
import { Wrapper } from "popup/__testHelpers__";

jest.mock(
  "popup/components/earn/PositionActivity/hooks/usePositionActivity",
  () => ({ usePositionActivity: jest.fn() }),
);
jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  stellarSdkServer: jest.fn(),
}));

const item = (over: Partial<PositionActivityItem>): PositionActivityItem => ({
  id: "1:0",
  protocol: "blend",
  positionId: "CPOOL",
  assetId: "CUSDC",
  type: PositionActivityType.DEPOSIT,
  amount: "6200000000",
  occurredAt: "2026-08-28T14:33:00Z",
  txHash: "deposit-hash",
  usdValueAtEvent: null,
  ...over,
});

const ITEMS = [
  item({
    id: "2:0",
    type: PositionActivityType.WITHDRAW,
    amount: "1200000000",
    txHash: "withdraw-hash",
  }),
  item({}),
  // A type this client has no row for yet: listed, but nothing to open.
  item({ id: "3:0", type: "claim", txHash: "claim-hash" }),
];

const renderList = () =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <PositionActivity
        poolId="CPOOL"
        assetId="CUSDC"
        code="USDC"
        decimals={7}
        assetIcons={{}}
        poolName="Fixed v2.1"
        networkDetails={TESTNET_NETWORK_DETAILS}
      />
    </Wrapper>,
  );

describe("PositionActivity", () => {
  beforeEach(() => {
    (usePositionActivity as jest.Mock).mockReturnValue(ITEMS);
    // Horizon never answers: the sheet's own tests cover what it brings.
    (stellarSdkServer as jest.Mock).mockReturnValue({
      transactions: () => ({
        transaction: () => ({ call: () => new Promise(() => undefined) }),
      }),
    });
  });

  // The rows keep their signs; the sheet drops them.
  it("signs the rows: deposits in, withdrawals out", () => {
    renderList();

    const [withdraw, deposit] = screen.getAllByTestId("position-activity-row");
    expect(withdraw).toHaveTextContent("-120.00 USDC");
    expect(deposit).toHaveTextContent("+620.00 USDC");
  });

  it("opens a withdrawal's details, unsigned", () => {
    renderList();

    fireEvent.click(screen.getAllByTestId("position-activity-row")[0]);

    const sheet = screen.getByTestId("earn-withdraw-details");
    expect(sheet).toHaveTextContent("Withdrew {{code}}");
    expect(
      within(sheet).getByTestId("earn-withdraw-details-amount"),
    ).toHaveTextContent(/^120\.00 USDC$/);
  });

  it("opens a deposit's details", () => {
    renderList();

    fireEvent.click(screen.getAllByTestId("position-activity-row")[1]);

    expect(screen.getByTestId("earn-deposit-details-amount")).toHaveTextContent(
      /^620\.00 USDC$/,
    );
  });

  it("leaves a row without a details sheet untappable", () => {
    renderList();

    const generic = screen.getAllByTestId("position-activity-row")[2];
    expect(generic.tagName).toBe("DIV");
    fireEvent.click(generic);
    expect(screen.queryByTestId("earn-deposit-details")).toBeNull();
    expect(screen.queryByTestId("earn-withdraw-details")).toBeNull();
  });
});
