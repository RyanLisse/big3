# AI Agent SDK Upgrade Guide

## Using the Modernization Tool

### 1. Install & Setup
```bash
pnpm install
pnpm modernize:analyze 1.0.0 1.1.0
```

### Migration Paths
- **0.1.0 → 1.0.0**: Medium effort, breaking (agent creation, model config)
- **1.0.0 → 1.1.0**: Low effort, non-breaking (checkpointing)

### Common Upgrades
1. **Effect Migration**: Use `Effect.gen` over callbacks
2. **Branded Types**: SDKVersion strict matching
3. **Layers**: Dependency injection

See `src/modernize/index.ts` for analysis API.
