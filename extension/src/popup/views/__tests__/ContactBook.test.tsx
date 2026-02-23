import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { ContactBook } from "../ContactBook";

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    ...original,
    Federation: { Server: { resolve: jest.fn() } },
  };
});

jest.mock("popup/components/identicons/IdenticonImg", () => ({
  IdenticonImg: ({ publicKey }: { publicKey: string }) => (
    <div data-testid={`identicon-${publicKey}`} />
  ),
}));

jest.mock("helpers/stellar", () => ({
  isValidStellarAddress: jest.fn(() => true),
  isFederationAddress: jest.fn(() => false),
  truncatedPublicKey: jest.fn(
    (key: string) => key.slice(0, 4) + "..." + key.slice(-4),
  ),
}));

const mockToastSuccess = jest.fn();
jest.mock("sonner", () => ({
  toast: { success: (...args: any[]) => mockToastSuccess(...args) },
}));

const mockClipboardWriteText = jest.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: { writeText: mockClipboardWriteText },
});

const VALID_ADDRESS_1 =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const VALID_ADDRESS_2 =
  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

const renderContactBook = () =>
  render(
    <Wrapper
      routes={[ROUTES.contactBook]}
      state={{
        auth: {
          error: null,
          applicationState: APPLICATION_STATE.PASSWORD_CREATED,
          publicKey: "G1",
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
      }}
    >
      <ContactBook />
    </Wrapper>,
  );

const { isValidStellarAddress } = jest.requireMock("helpers/stellar");

/**
 * Helper: add a contact via the UI (opens modal, fills fields, clicks Save).
 * Must be called after renderContactBook().
 */
const addContactViaUI = async (address: string, name: string) => {
  const plusButton = document.querySelector(".ContactBook__add-button")!;
  fireEvent.click(plusButton);

  const addressInput = screen.getByPlaceholderText("Address");
  const nameInput = screen.getByPlaceholderText("Name");

  fireEvent.change(addressInput, { target: { value: address } });
  fireEvent.change(nameInput, { target: { value: name } });

  await waitFor(() => {
    expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
  });

  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => {
    expect(screen.getByText(name)).toBeInTheDocument();
  });
};

describe("ContactBook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isValidStellarAddress as jest.Mock).mockReturnValue(true);
  });

  describe("Empty State", () => {
    it("shows empty state when no contacts exist", () => {
      renderContactBook();

      expect(
        screen.getByText(
          "Contacts are wallets you recognize, helpful for recurring or trusted sends.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Add a Contact")).toBeInTheDocument();
    });

    it("can add contact from empty state button", async () => {
      renderContactBook();

      fireEvent.click(screen.getByText("Add a Contact"));

      expect(
        document.querySelector(".EditContactCard__title"),
      ).toHaveTextContent("Add a Contact");

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: { value: VALID_ADDRESS_1 },
      });

      fireEvent.change(nameInput, { target: { value: "New Contact" } });

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("New Contact")).toBeInTheDocument();
      });
    });

    it("shows empty state after all contacts are deleted", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Delete contact"));

      expect(
        screen.getByText(
          "Contacts are wallets you recognize, helpful for recurring or trusted sends.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Add Contact Flow", () => {
    it("opens add modal when plus button is clicked", () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      expect(
        document.querySelector(".EditContactCard__title"),
      ).toHaveTextContent("Add a Contact");
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("adds a new contact successfully", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      fireEvent.change(nameInput, { target: { value: "New Friend" } });

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("New Friend")).toBeInTheDocument();
      });
    });

    it("shows toast when contact is added", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      fireEvent.change(nameInput, { target: { value: "New Friend" } });

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "Contact successfully added",
        );
      });
    });

    it("closes modal when Cancel is clicked", () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      expect(
        document.querySelector(".EditContactCard__title"),
      ).toHaveTextContent("Add a Contact");

      fireEvent.click(screen.getByText("Cancel"));

      expect(
        document.querySelector(".EditContactCard__title"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Contact List", () => {
    it("renders contacts after adding them", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      expect(screen.getByText("Piyal")).toBeInTheDocument();
      expect(screen.getByText("Cassio")).toBeInTheDocument();
    });

    it("shows truncated addresses for contacts", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      expect(
        screen.getByText(
          VALID_ADDRESS_1.slice(0, 4) + "..." + VALID_ADDRESS_1.slice(-4),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          VALID_ADDRESS_2.slice(0, 4) + "..." + VALID_ADDRESS_2.slice(-4),
        ),
      ).toBeInTheDocument();
    });

    it("renders identicons for each contact", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      expect(
        screen.getByTestId(`identicon-${VALID_ADDRESS_1}`),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`identicon-${VALID_ADDRESS_2}`),
      ).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("Save button is disabled when fields are empty", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).toBeDisabled();
      });
    });

    it("Save button is disabled when only address is filled", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).toBeDisabled();
      });
    });

    it("Save button is disabled when only name is filled", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const nameInput = screen.getByPlaceholderText("Name");
      fireEvent.change(nameInput, { target: { value: "Alice" } });

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).toBeDisabled();
      });
    });

    it("Save button is enabled when both fields are valid", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      const nameInput = screen.getByPlaceholderText("Name");

      fireEvent.change(addressInput, {
        target: {
          value: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7DCF7KRXCNX",
        },
      });

      fireEvent.change(nameInput, { target: { value: "New Contact" } });

      await waitFor(() => {
        const saveButton = screen.getByText("Save").closest("button");
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("shows error for invalid Stellar address", async () => {
      (isValidStellarAddress as jest.Mock).mockReturnValue(false);

      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: { value: "INVALIDADDRESS" },
      });
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(screen.getByText("Invalid Stellar address")).toBeInTheDocument();
      });
    });

    it("shows error for empty name", async () => {
      renderContactBook();

      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const nameInput = screen.getByPlaceholderText("Name");
      fireEvent.change(nameInput, { target: { value: "A" } });
      fireEvent.change(nameInput, { target: { value: " " } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText("Name cannot be empty")).toBeInTheDocument();
      });
    });

    it("shows duplicate address error", async () => {
      renderContactBook();

      // First add a contact
      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      // Now try to add another contact with the same address
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const addressInput = screen.getByPlaceholderText("Address");
      fireEvent.change(addressInput, {
        target: { value: VALID_ADDRESS_1 },
      });
      fireEvent.blur(addressInput);

      await waitFor(() => {
        expect(
          screen.getByText("This address already exists in your contacts"),
        ).toBeInTheDocument();
      });
    });

    it("shows duplicate name error", async () => {
      renderContactBook();

      // First add a contact
      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      // Now try to add another contact with the same name
      const plusButton = document.querySelector(".ContactBook__add-button")!;
      fireEvent.click(plusButton);

      const nameInput = screen.getByPlaceholderText("Name");
      fireEvent.change(nameInput, { target: { value: "Piyal" } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(
          screen.getByText("This name already exists in your contacts"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Contact Menu Actions", () => {
    it("opens context menu when dots button is clicked", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);

      expect(screen.getByText("Edit contact")).toBeInTheDocument();
      expect(screen.getByText("Copy address")).toBeInTheDocument();
      expect(screen.getByText("Delete contact")).toBeInTheDocument();
    });

    it("copies address when Copy address is clicked", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Copy address"));

      await waitFor(() => {
        expect(mockClipboardWriteText).toHaveBeenCalledWith(VALID_ADDRESS_1);
        expect(mockToastSuccess).toHaveBeenCalledWith("Address copied");
      });
    });

    it("deletes contact when Delete contact is clicked", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");
      await addContactViaUI(VALID_ADDRESS_2, "Cassio");

      const menuTriggers = document.querySelectorAll(
        ".ContactBook__row__menu-trigger",
      );
      fireEvent.click(menuTriggers[0]);
      fireEvent.click(screen.getByText("Delete contact"));

      expect(screen.queryByText("Piyal")).not.toBeInTheDocument();
      expect(screen.getByText("Cassio")).toBeInTheDocument();
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Contact successfully deleted",
      );
    });

    it("opens edit modal with pre-filled data", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Edit contact"));

      expect(screen.getByText("Edit a Contact")).toBeInTheDocument();
      expect(screen.getByDisplayValue(VALID_ADDRESS_1)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Piyal")).toBeInTheDocument();
    });

    it("saves edited contact", async () => {
      renderContactBook();

      await addContactViaUI(VALID_ADDRESS_1, "Piyal");

      const menuTrigger = document.querySelector(
        ".ContactBook__row__menu-trigger",
      )!;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText("Edit contact"));

      const nameInput = screen.getByDisplayValue("Piyal");
      fireEvent.change(nameInput, { target: { value: "Piyal Updated" } });

      await waitFor(() => {
        expect(screen.getByText("Save").closest("button")).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText("Save"));

      await waitFor(() => {
        expect(screen.getByText("Piyal Updated")).toBeInTheDocument();
        expect(screen.queryByText("Piyal")).not.toBeInTheDocument();
      });
    });
  });
});
