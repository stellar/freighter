# Integration Tests

Tests in this folder are designed to work in **both modes**:

## Running Tests

### With Integration Mode OFF (Default)

```bash
yarn test:e2e integration-tests
```

When `IS_INTEGRATION_MODE` is not set, tests use `stubAllExternalApis()` in a `beforeEach` hook to mock all external API calls. This allows tests to run quickly and reliably without depending on external services.

### With Integration Mode ON

```bash
IS_INTEGRATION_MODE=true yarn test:e2e integration-tests
```

When `IS_INTEGRATION_MODE=true`, the `beforeEach` hook skips stubbing, and tests use real API calls against actual Stellar testnet and external services. This validates that the application works correctly with real data.

## Test Requirements

All tests in this folder must pass in **both scenarios**:

1. **Stubbed Mode** (`IS_INTEGRATION_MODE` not set)

   - External APIs are mocked with consistent test data
   - Tests run fast and reliably
   - No dependency on external services being available

2. **Integration Mode** (`IS_INTEGRATION_MODE=true`)
   - Tests use real Stellar testnet APIs
   - Real fee stats, account balances, and transaction data
   - Real network responses and delays
   - Account must be funded and in valid state

## Files

- `addAssetIntegration.test.ts` - Asset management workflows
- `freighterApiIntegration.test.ts` - Freighter API integration with freighter-api
- `sendIntegration.test.ts` - Payment sending workflows

## What Should Be Added Here

- Tests that confirm core flows
- Tests that confirm signing and submitting transactions
