# E2E Tests for Freighter Extension

This directory contains end-to-end tests for the Freighter wallet extension using Playwright.

## Prerequisites

Before running the tests, ensure you have:

1. **Node.js and Yarn**: Install dependencies from the root of the extension directory
2. **Built Extension**: The extension must be built before running tests

## Setup

### 1. Install Dependencies

From the root directory:

```bash
yarn install
```

### 2. Configure Backend

If you need to test against a specific backend, create an `.env` file at `extension/.env`:

```
INDEXER_URL=INSERT_YOUR_INDEXER_URL_V1
```

```
INDEXER_V2_URL=INSERT_YOUR_INDEXER_URL_V2
```

### 3. Build the Extension

The tests run against the built extension in the `extension/build` directory:

```bash
yarn build:extension
```

## Running Tests

### Run All Tests

From the root directory:

```bash
yarn test:e2e
```

### Run Specific Test Files

```bash
yarn test:e2e sendPayment.test.ts
```

### Run Tests in UI Mode

Playwright provides a UI mode for debugging:

```bash
yarn test:e2e --ui
```

### Run Tests in Headed Mode

To see the browser while tests run:

```bash
yarn test:e2e --headed
```

### Run Specific Tests by Name

```bash
yarn test:e2e -g "Send doesn't throw error"
```

## Test Structure

### Test Files

- `accountHistory.test.ts` - Tests for account history and transaction viewing
- `addAsset.test.ts` - Tests for adding custom assets
- `addCollectible.test.ts` - Tests for adding NFTs/collectibles
- `allowList.test.ts` - Tests for domain allowlist functionality
- `buyWithOnramp.test.ts` - Tests for on-ramp integration
- `loadAccount.test.ts` - Tests for loading/importing accounts
- `login.test.ts` - Tests for authentication flows
- `memo.test.ts` - Tests for memo functionality in transactions
- `onboarding.test.ts` - Tests for user onboarding flow
- `sendCollectible.test.ts` - Tests for sending NFTs
- `sendPayment.test.ts` - Tests for payment functionality
- `translations-pt.test.ts` - Tests for Portuguese translations

### Test Fixtures

The `test-fixtures.ts` file provides custom fixtures for:

- Browser context with extension loaded
- Extension ID extraction
- Service worker access
- Language configuration

### Helpers

The `helpers/` directory contains:

- `login.ts` - Authentication helper functions
- `stubs.ts` - API mocking utilities
- `test-token.ts` - Test token constants

## Test Configuration

The Playwright configuration is in `extension/playwright.config.ts`:

- **Timeout**: 15 seconds per test
- **Retries**: 5 attempts on failure
- **Workers**: 8 locally, 4 on CI
- **Browser**: Chromium only
- **Viewport**: 1280x720

## Debugging Tests

### View Test Traces

When tests fail, traces are automatically captured:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Debug Mode

Run with the Playwright Inspector:

```bash
PWDEBUG=1 npx playwright test
```

### Take Screenshots on Failure

Screenshots are automatically captured in the `test-results/` directory when tests fail.

## Integration Mode

For running tests sequentially (useful for tests that modify shared state):

```bash
IS_INTEGRATION_MODE=true yarn test:e2e
```

## CI

### GitHub Actions

e2e tests are run in CI by this GitHub action workflow: https://github.com/stellar/freighter/blob/master/.github/workflows/runTests.yml

This job runs on every commit on a PR.

This workflow toggles IS_INTEGRATION_MODE `on` if the branch is pointing at `master` (indicating that we're getting ready to deploy to production)

### View CI Test Trace

In CI, if the tests fail, the GitHub Action will upload an artifact that will allow you to view a recording of what happened in the browser in CI. This link will be visible in the test run in the `Run actions/upload-artifact@v5` step. Download this artifact and unzip.

The failed tests can be viewed using the `show-trace` command:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Common Issues

### Extension Not Loading

- Ensure the extension is built: `yarn build`
- Check that `extension/build` directory exists

### Test Timeouts

- Tests are marked with `test.slow()` for operations that may take longer
- Default timeout is 15 seconds, with 5 retries

### API Stubs Not Working

- Check that stub functions are properly defined in test setup
- Ensure routes are registered before navigation

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";

test("My test description", async ({ page, extensionId, context }) => {
  test.slow(); // If test needs more time

  // loginToTestAccount will automatically stub all API's by default
  await loginToTestAccount({ page, extensionId, context });

  // Your test code here
  await page.getByTestId("my-element").click();
  await expect(page.getByText("Expected text")).toBeVisible();
});
```

### Using Stubs

```typescript
const stubOverrides = async () => {
  await stubAccountBalancesWithUSDC(page);
};

await loginToTestAccount({ page, extensionId, context, stubOverrides });
```

## Snapshot Testing

Snapshot tests capture visual or structural baselines of your application and compare future runs against those baselines. This helps catch unintended visual regressions.

### Visual Snapshots

Freighter uses the `expectPageToHaveScreenshot` function for visual snapshot testing:

```typescript
await expectPageToHaveScreenshot({
  page,
  screenshot: "my-feature.png",
});
```

**Snapshot files** are stored in directories alongside test files:

- `sendPayment.test.ts` → `sendPayment.test.ts-snapshots/`
- `addAsset.test.ts` → `addAsset.test.ts-snapshots/`

### Updating Snapshots

When you intentionally change the UI, update snapshots:

```bash
yarn test:e2e --update-snapshots
```

Or update snapshots for a specific test:

```bash
yarn test:e2e sendPayment.test.ts --update-snapshots
```

### Reviewing Snapshot Changes

When a snapshot test fails, you can review the differences:

1. **In the test results directory**:

   ```
   test-results/[test-name]/
   ├── expected.png    (baseline snapshot)
   ├── actual.png      (current output)
   └── diff.png        (visual diff highlighting changes)
   ```

2. **In VS Code**: Use the "Compare" feature on actual/expected/diff images

3. **In CI**: Download the test artifacts to review snapshot diffs locally

### Best Practices

- **Keep snapshots focused**: Use snapshots to verify specific UI components or pages
- **Review carefully**: Always review snapshot diffs before updating to catch unintended changes
- **Commit snapshots**: Include updated snapshots in your git commits
- **Avoid flaky snapshots**:
  - Mock dates/times if they appear in screenshots
  - Ensure consistent asset loading states
  - Use fixed viewports (Playwright provides 1280x720)
- **Document changes**: Add comments when updating snapshots for intentional UI changes

### Example Snapshot Test

```typescript
import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";

test("Send payment review screen matches snapshot", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  // Navigate to send flow
  await page.getByTestId("nav-link-send").click();
  await page.getByTestId("send-amount-amount-input").fill("100");
  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click();

  // Capture the payment review screen
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-review.png",
  });
});
```

## CI/CD

Tests run automatically in CI with:

- 4 parallel workers
- 1-hour global timeout
- Fail-fast on first failure after retries
- `test.only` forbidden in CI

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Freighter Extension README](../README.md)
- [Test Snapshots](./sendPayment.test.ts-snapshots/) - Visual regression test baselines
