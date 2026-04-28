# Testing Guide

This document outlines how to run the various tests for the Experity Care Agent project.

## Test Types

The project uses four main types of tests:

1. **Unit Tests** - Using Vitest for testing individual functions and components
2. **Integration Tests** - Using Vitest against a dedicated local MariaDB test schema.
3. **End-to-End (E2E) Tests** - TBD

## Prerequisites

Before running tests, ensure:

1. You have installed all dependencies: `npm install`
2. Environment variables are correctly set up (if needed)

## Running Unit Tests

Unit tests use ViTest and are located in the `tests/unit` and other test directories.

```bash
# Run the full test suite
npm run test

# Run all unit tests directly
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

Integration tests load `.env.test` from the dashboard repo and refuse to run against a non-test
database name.

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=preservationtest
DB_USER=mariadb
DB_PASS=docker
```

If your regular MariaDB user cannot create schemas, create `preservationtest` once with an
admin account. After that, the test harness resets tables inside that schema on each integration
run.

```bash
# Run only integration tests
npm run test:integration

# Run unit + integration together
npm run test:all

# Run a specific integration test file
npm run test:integration -- tests/integration/something.integration.test.ts

# or (more simply)

npm run test:integration something.integration.test.ts
```

### Isolation Model

Integration tests use a dedicated test schema and reset that schema once at the start of the
integration run. Each test then executes inside a rollback transaction, so test inserts do not
persist and tests do not collide with each other.

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

The default test command includes integration tests. Any environment running `npm run test`
therefore needs a reachable MariaDB instance and a dedicated test schema configured through
`.env.test`.

## Resources
