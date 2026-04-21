# Testing Guide

This document outlines how to run the various tests for the Experity Care Agent project.

## Test Types

The project uses four main types of tests:

1. **Unit Tests** - Using Vitest for testing individual functions and components
2. **Integration Tests** - Using Vitest, a local MySQL DB and transactions.
3. **End-to-End (E2E) Tests** - TBD

## Prerequisites

Before running tests, ensure:

1. You have installed all dependencies: `npm install`
2. Environment variables are correctly set up (if needed)

## Running Unit Tests

Unit tests use ViTest and are located in the `tests/unit` and other test directories.

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode (good for development)
npm run test:unit:watch

# Generate test coverage report
npm run test:coverage
```

The coverage report will be available in the `coverage` directory.

## Running End-to-End Tests

These are still TBD. I believe we will use Gherkin, Cucumber, and Playwright.

```bash
# Run E2E tests
npm run test:e2e
```

### Example Feature File

```gherkin
Feature: Basic Patient Information Collection

  Scenario: Agent collects patient information
    Given a new conversation with the basic patient info agent
    When the user provides their name "John Doe"
    And the user provides their date of birth "1990-01-01"
    Then the agent should store the name as "John Doe"
    And the agent should store the date of birth as "1990-01-01"
```

## Running Integration Tests

Run tests against a local DB

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cwis_preservation
DB_USER=mariadb
DB_PASS=docker
```

```bash
# Run only integration tests
npm run test:integration

# Run a specific integration test file
npm run test:integration -- tests/integration/something.integration.test.ts

# or (more simply)

npm run test:integration something.integration.test.ts
```

### Transaction-Based Testing

Integration tests use **transaction-based testing** to prevent data pollution and ensure test isolation. All database operations are wrapped in transactions that are automatically rolled back after each test.

**Key Benefits:**

- **No Data Pollution**: All test data is automatically cleaned up
- **Test Isolation**: Tests can't interfere with each other
- **Real Database Testing**: Tests actual database interactions
- **Automatic Cleanup**: No manual cleanup required

For detailed information about the transaction-based testing approach, see [Integration Test Transactions](./INTEGRATION_TEST_TRANSACTIONS.md).

## Test Results

### Unit Tests (ViTest)

- Test output is shown in the terminal
- Coverage reports are generated in the `coverage` directory
- The project is configured with coverage thresholds in `vitest.config.ts`

### E2E Test Results

TBD

## Writing Tests

### Unit Tests

- Write tests in files with `.test.ts`, `.test.tsx` extensions
- Place unit tests in the `tests/unit` directory
- Use ViTest's API for assertions

### E2E Tests

- Write feature files in `tests/e2e/features/` using Gherkin syntax
- Implement step definitions
- Step definitions go in `tests/e2e/step_definitions/given`, `tests/e2e/step_definitions/when`, or `tests/e2e/step_definitions/then` respectively

### Integration Tests

- Write tests in files with `.integration.test.ts`, `.integration.test.tsx` extensions
- Place unit tests in the `tests/integration` directory
- Use ViTest's API for assertions

## Continuous Integration

Tests are run automatically during CI/CD pipeline execution.

## Resources
