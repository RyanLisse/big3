---
description: tdd workflow for all feature development. **All code changes must follow the Red-Green-Refactor cycle with failing tests written first
auto_execution_mode: 3
---

# Test-Driven Development Workflow

## Overview

This document outlines the mandatory TDD (Test-Driven Development) workflow for all feature development. **All code changes must follow the Red-Green-Refactor cycle with failing tests written first.**

## Core Principles

### 1. Tests First, Always
- **NO CODE CHANGES** without failing tests first
- **NO EXCEPTIONS** for any feature, bug fix, or refactoring
- **NO MERGING** code without comprehensive test coverage

### 2. Red-Green-Refactor Cycle
1. **RED**: Write failing test defining expected behavior
2. **GREEN**: Implement minimal code to make test pass
3. **REFACTOR**: Clean up code while keeping tests green

### 3. Test Coverage Requirements
- **Unit Tests**: ≥80% coverage for all modules
- **Integration Tests**: Cover critical user journeys
- **Regression Tests**: Prevent functionality regressions

## Workflow Checklist

### Phase 1: Planning & Design
- [ ] **Understand Requirements**: Document user story and acceptance criteria
- [ ] **Identify Test Cases**: List all scenarios (happy path, edge cases, error conditions)
- [ ] **Design API/Interface**: Define function signatures and expected behavior
- [ ] **Check Dependencies**: Ensure no circular imports or breaking changes

### Phase 2: Red Phase - Write Failing Tests
- [ ] **Create Test File**: Follow naming convention `*.test.ts`
- [ ] **Import Dependencies**: Set up test imports and mocks
- [ ] **Write Test Cases**: One test per behavior/scenario
- [ ] **Run Tests**: Confirm all tests fail (RED)
- [ ] **Review Test Quality**: Tests should be readable and maintainable

### Phase 3: Green Phase - Implement Minimal Solution
- [ ] **Write Production Code**: Minimal implementation to pass tests
- [ ] **Run Tests**: Confirm all tests pass (GREEN)
- [ ] **No Over-Engineering**: Only implement what's tested
- [ ] **Check Types**: Ensure TypeScript compilation succeeds

### Phase 4: Refactor Phase - Clean Up
- [ ] **Refactor Code**: Improve readability and maintainability
- [ ] **Run Tests**: Ensure refactoring doesn't break functionality
- [ ] **Remove Dead Code**: Clean up unused imports and variables
- [ ] **Add Documentation**: Update comments and README if needed

### Phase 5: Quality Gates
- [ ] **Run Full Test Suite**: `pnpm test --coverage`
- [ ] **Quality Checks**: `pnpm qlty` (zero high-severity issues)
- [ ] **Type Checks**: `pnpm ultracite fix --check`
- [ ] **Integration Tests**: Run relevant integration tests
- [ ] **Peer Review**: Get code review from team member

## Test Categories & Examples

### Unit Tests
```typescript
// ✅ Good: Test one behavior with clear expectations
describe('ModelConfiguration', () => {
  it('should pin model version correctly', () => {
    const config = new ModelConfiguration();
    config.pinVersion('sttModel', 'gpt-4o-transcribe-v2');

    expect(config.getPinnedVersion('sttModel')).toBe('gpt-4o-transcribe-v2');
  });

  it('should throw error for invalid model type', () => {
    const config = new ModelConfiguration();

    expect(() => {
      config.pinVersion('invalidModel', 'v1');
    }).toThrow('Invalid model type');
  });
});
```

### Integration Tests
```typescript
// ✅ Good: Test component interactions
describe('Audio Pipeline Integration', () => {
  it('should process audio through complete pipeline', async () => {
    const pipeline = new VoicePipeline();
    const audioBuffer = await generateTestAudio('Hello world');

    const result = await pipeline.processAudio(audioBuffer);

    expect(result.transcript).toBe('Hello world');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.modelUsed).toBeDefined();
  });
});
```

### Audio Model Validation Tests
```typescript
// ✅ Good: Test validation workflow
describe('Audio Model Validation', () => {
  it('should validate model performance against benchmarks', async () => {
    // RED: Write failing test first
    const { validateAudioModels } = await import('../scripts/validate-audio.mjs');

    // Mock dependencies
    vi.mock('../src/services/audio-regression.js');

    const result = await validateAudioModels();

    // Assertions
    expect(result.accuracy).toBeGreaterThanOrEqual(0.95);
    expect(result.latency).toBeLessThan(2000);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
  });
});
```

## Common TDD Anti-Patterns

### ❌ Writing Code First
```typescript
// DON'T DO THIS
function processAudio(audio: Buffer) {
  // Write implementation first
  return { transcript: 'hello', confidence: 0.9 };
}

// THEN write test
it('should process audio', () => {
  expect(processAudio(testAudio)).toEqual({ transcript: 'hello', confidence: 0.9 });
});
```

### ❌ Tests That Don't Fail
```typescript
// DON'T DO THIS
it('should return something', () => {
  const result = myFunction();
  expect(result).toBeDefined(); // Too vague, won't catch bugs
});
```

### ❌ Testing Implementation Details
```typescript
// DON'T DO THIS
it('should call internal method', () => {
  const spy = vi.spyOn(service, 'internalMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled(); // Tests how, not what
});
```

### ❌ No Edge Cases
```typescript
// DON'T DO THIS
it('should work', () => {
  expect(add(2, 3)).toBe(5);
  // Missing: negative numbers, zero, large numbers, NaN, etc.
});
```

## Audio Model Lifecycle TDD Workflow

### Model Configuration Changes
1. **RED**: Write failing test for new configuration behavior
2. **GREEN**: Update `ModelConfiguration` to support new model
3. **REFACTOR**: Clean up code and add validation
4. **VALIDATE**: Run `pnpm run validate-audio` to ensure performance

### Validation Script Updates
1. **RED**: Write failing test for new validation metric
2. **GREEN**: Implement metric calculation in validation script
3. **REFACTOR**: Optimize performance and error handling
4. **INTEGRATE**: Update CI pipeline to use new validation

### Audit Logging Changes
1. **RED**: Write failing test for new audit event type
2. **GREEN**: Add event logging to relevant service
3. **REFACTOR**: Improve log search and export functionality
4. **COMPLIANCE**: Verify audit trail meets requirements

## Quality Gates

### Pre-Commit Checks
```bash
# Must pass before any commit
pnpm test --run --coverage  # ≥80% coverage
pnpm qlty                   # Zero high-severity issues
pnpm ultracite fix --check # No formatting issues
```

### CI Pipeline Requirements
- All tests pass on every PR
- Coverage reports uploaded
- Quality metrics tracked
- Audio validation runs for model changes

### Code Review Checklist
- [ ] Tests written before implementation
- [ ] Test coverage ≥80% for changed code
- [ ] No high-severity quality issues
- [ ] Edge cases covered
- [ ] Error conditions handled
- [ ] Documentation updated

## Tools & Commands

### Running Tests
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test --run tests/unit/config/models.test.ts

# Run tests in watch mode
pnpm test --watch
```

### Quality Checks
```bash
# Lint and format check
pnpm qlty

# Auto-fix issues
pnpm qlty:fix

# TypeScript check
pnpm ultracite fix --check
```

### Audio Validation
```bash
# Run model validation
pnpm run validate-audio

# Validate specific models
VOICE_STT_MODEL=gpt-4o-transcribe-v2 pnpm run validate-audio
```

## Troubleshooting

### Tests Not Running
- Check test file naming: `*.test.ts`
- Verify imports are correct
- Check for syntax errors in test files

### Coverage Too Low
- Add missing test cases
- Remove dead code
- Use coverage exclusions for generated files

### Quality Issues
- Run `pnpm qlty:fix` to auto-fix
- Review error messages carefully
- Update code style to match project standards

### Validation Failures
- Check model API access
- Verify benchmark data exists
- Review performance metrics against targets

## Enforcement

**TDD violations will result in:**
- PR rejection until tests are added
- Code review feedback requiring test-first approach
- Team discussion on process improvement

**Remember**: Tests are the safety net for confident refactoring and the specification for expected behavior. Invest in good tests upfront to save time and prevent bugs.
