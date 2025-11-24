# Contracts Usage

Modernization exposes contracts via `ModernizationAnalysis`:

```ts
import { analyzeModernization } from '../src/modernize';

const analysis = analyzeModernization('1.0.0', '1.1.0');
console.log(analysis.compatibilityCheck.isCompatible); // false
console.log(analysis.suggestedMigrationPaths); // paths
```

Full type: `ModernizationAnalysis` in src/modernize/index.ts
