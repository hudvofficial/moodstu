# Test Suite for P0 Finance Fixes

## Overview

This test suite validates the 4 critical (P0) fixes implemented for the Finance module.

## Test Structure

```
tests/
├── unit/                           # Unit tests (fast, no DB)
│   ├── amount-validation.test.ts   # P0-3: Amount validation
│   ├── finance-utils.test.ts       # P0-3: asNumber() clamping
│   └── fallback-limits.test.ts     # P0-1: Memory limits
│
├── integration/                    # Integration tests (requires DB)
│   └── payment-race-condition.test.ts  # P0-2: Concurrent payments
│
├── e2e/                            # End-to-end tests (existing)
│   └── contract-operational.spec.ts
│
├── setup.ts                        # Jest setup
└── README.md                       # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (fast, no DB required)
npm run test:unit

# Run only integration tests (requires DB connection)
npm run test:integration

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Coverage

### P0-1: Fallback Query Limits
- **File:** `tests/unit/fallback-limits.test.ts`
- **Tests:** 15 tests
- **Coverage:**
  - Memory usage calculations
  - Limit verification
  - Performance estimations
  - Regression prevention

### P0-2: Payment Race Condition
- **File:** `tests/integration/payment-race-condition.test.ts`
- **Tests:** 6 integration tests
- **Coverage:**
  - Concurrent payment scenario
  - Overpayment prevention
  - Float precision fix
  - Performance under load
- **Requirements:**
  - Database connection
  - Migration 20260527120000 applied
  - NEXT_PUBLIC_SUPABASE_URL env var
  - SUPABASE_SERVICE_ROLE_KEY env var

### P0-3: Amount Validation
- **Files:**
  - `tests/unit/amount-validation.test.ts` (30 tests)
  - `tests/unit/finance-utils.test.ts` (20 tests)
- **Coverage:**
  - Positive/negative amounts
  - Min/max bounds
  - NaN/Infinity handling
  - Type coercion
  - Edge cases
  - Regression prevention

## Environment Setup

### For Unit Tests
No setup required - can run immediately.

### For Integration Tests

1. **Create `.env.test` file:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

2. **Apply migrations:**
```bash
npm run migrate
```

3. **Run integration tests:**
```bash
npm run test:integration
```

## Test Metrics

### Expected Results
```
Unit Tests:       65 tests  ✅ (100% pass)
Integration Tests: 6 tests  ✅ (requires DB)
Total Coverage:   >70%      ✅
Run Time (unit):  <5s       ✅
Run Time (integ): <30s      ✅
```

### Performance Benchmarks
- Amount validation: <1ms per call
- Finance utils clamping: <1ms per call
- Concurrent payment test: <10s for 10 concurrent requests

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run unit tests
  run: npm run test:unit

- name: Run integration tests
  run: npm run test:integration
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Debugging Failed Tests

### Unit Test Failures
1. Check Node version (requires Node 18+)
2. Install dependencies: `npm install`
3. Run with verbose: `npm test -- --verbose`

### Integration Test Failures
1. Verify DB connection: `npm run migrate:verify`
2. Check migrations applied: `npm run migrate`
3. Verify env vars: `echo $NEXT_PUBLIC_SUPABASE_URL`
4. Run single test: `npm test -- payment-race-condition`

## Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Use describe/it structure from existing tests
4. Add to this README's coverage section

## Related Documentation

- [FINANCE_AUDIT_REPORT.md](../FINANCE_AUDIT_REPORT.md) - Full audit findings
- [Jest Config](../jest.config.js) - Test configuration
- [P0 Fixes Branch](https://github.com/your-repo/pull/XXX)

---

**Last Updated:** 2026-05-27  
**Maintained By:** Finance Module Team
