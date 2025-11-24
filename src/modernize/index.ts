/**
 * Code Modernization Tooling - Implementation
 *
 * Provides code modernization capabilities for the AI Agent SDK:
 * - Version detection
 * - Dependency analysis
 * - Migration path generation
 * - Backwards compatibility checking
 *
 * This is an experimental/preview feature for SDK version upgrade support.
 */

import { z } from "zod";

// ============================================================================
// Type Definitions
// ============================================================================

export type SDKVersion = `${number}.${number}.${number}`;

export type SemanticVersion = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
};

export enum BreakingChangeType {
  API_REMOVAL = "API_REMOVAL",
  API_SIGNATURE_CHANGE = "API_SIGNATURE_CHANGE",
  TYPE_CHANGE = "TYPE_CHANGE",
  BEHAVIOR_CHANGE = "BEHAVIOR_CHANGE",
  DEPENDENCY_UPDATE = "DEPENDENCY_UPDATE",
}

export type BreakingChange = {
  readonly version: SDKVersion;
  readonly type: BreakingChangeType;
  readonly apiName: string;
  readonly description: string;
  readonly migrationGuide: string;
};

export type Dependency = {
  readonly name: string;
  readonly currentVersion: SDKVersion;
  readonly latestVersion: SDKVersion;
  readonly isBreaking: boolean;
};

export type DependencyAnalysisResult = {
  readonly dependencies: readonly Dependency[];
  readonly outdatedCount: number;
  readonly breakingCount: number;
};

export type MigrationStep = {
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly affectedAPIs: readonly string[];
  readonly codeExample: string;
  readonly warnings: readonly string[];
};

export type MigrationPath = {
  readonly fromVersion: SDKVersion;
  readonly toVersion: SDKVersion;
  readonly steps: readonly MigrationStep[];
  readonly estimatedEffort: "low" | "medium" | "high";
  readonly breaking: boolean;
};

export type CompatibilityCheckResult = {
  readonly isCompatible: boolean;
  readonly currentVersion: SDKVersion;
  readonly targetVersion: SDKVersion;
  readonly incompatibilities: readonly string[];
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
};

export type ModernizationAnalysis = {
  readonly version: SDKVersion;
  readonly dependencyAnalysis: DependencyAnalysisResult;
  readonly applicableBreakingChanges: readonly BreakingChange[];
  readonly compatibilityCheck: CompatibilityCheckResult;
  readonly suggestedMigrationPaths: readonly MigrationPath[];
};

// ============================================================================
// Version Utilities
// ============================================================================

const VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(versionString: string): SemanticVersion {
  const match = versionString.match(VERSION_REGEX);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

export function formatVersion(version: SemanticVersion): SDKVersion {
  return `${version.major}.${version.minor}.${version.patch}` as SDKVersion;
}

export function compareVersions(
  v1: SemanticVersion,
  v2: SemanticVersion
): -1 | 0 | 1 {
  if (v1.major !== v2.major) {
    return v1.major < v2.major ? -1 : 1;
  }
  if (v1.minor !== v2.minor) {
    return v1.minor < v2.minor ? -1 : 1;
  }
  if (v1.patch !== v2.patch) {
    return v1.patch < v2.patch ? -1 : 1;
  }
  return 0;
}

export function isVersionGreater(
  v1: SemanticVersion,
  v2: SemanticVersion
): boolean {
  return compareVersions(v1, v2) > 0;
}

export function isVersionLess(
  v1: SemanticVersion,
  v2: SemanticVersion
): boolean {
  return compareVersions(v1, v2) < 0;
}

// ============================================================================
// Breaking Changes Registry
// ============================================================================

export const BREAKING_CHANGES: readonly BreakingChange[] = [
  {
    version: "1.0.0" as SDKVersion,
    type: BreakingChangeType.API_REMOVAL,
    apiName: "createAgentLegacy",
    description:
      "Removed legacy agent creation API in favor of new SDK initialization flow",
    migrationGuide:
      "Use createAgent() with proper AgentConfig instead of createAgentLegacy()",
  },
  {
    version: "1.0.0" as SDKVersion,
    type: BreakingChangeType.API_SIGNATURE_CHANGE,
    apiName: "configureModel",
    description:
      "Model configuration signature changed to include provider field",
    migrationGuide:
      'Add "provider" field to model configuration: { provider: "openai", model: "gpt-4" }',
  },
  {
    version: "1.1.0" as SDKVersion,
    type: BreakingChangeType.TYPE_CHANGE,
    apiName: "WorkflowState",
    description: "WorkflowState type changed from enum to union type",
    migrationGuide:
      'Replace enum values with string literals: "planning" | "executing" | "validating" | "complete" | "failed"',
  },
  {
    version: "1.1.0" as SDKVersion,
    type: BreakingChangeType.BEHAVIOR_CHANGE,
    apiName: "executeWorkflow",
    description: "Workflow execution now requires explicit checkpointing",
    migrationGuide:
      "Add checkpointing configuration to workflow options: { checkpointing: { enabled: true } }",
  },
];

// ============================================================================
// Dependency Registry
// ============================================================================

export const SDK_DEPENDENCIES: readonly Dependency[] = [
  {
    name: "effect",
    currentVersion: "3.0.0" as SDKVersion,
    latestVersion: "3.0.5" as SDKVersion,
    isBreaking: false,
  },
  {
    name: "zod",
    currentVersion: "3.23.0" as SDKVersion,
    latestVersion: "3.23.8" as SDKVersion,
    isBreaking: false,
  },
  {
    name: "ws",
    currentVersion: "8.18.0" as SDKVersion,
    latestVersion: "8.19.0" as SDKVersion,
    isBreaking: false,
  },
  {
    name: "@langchain/langgraph",
    currentVersion: "1.0.2" as SDKVersion,
    latestVersion: "1.0.5" as SDKVersion,
    isBreaking: false,
  },
];

// ============================================================================
// Migration Path Registry
// ============================================================================

export const MIGRATION_PATHS: readonly MigrationPath[] = [
  {
    fromVersion: "0.1.0" as SDKVersion,
    toVersion: "1.0.0" as SDKVersion,
    steps: [
      {
        order: 1,
        title: "Update Agent Creation",
        description:
          "Replace legacy createAgentLegacy() with new createAgent() API",
        affectedAPIs: ["createAgent", "createAgentLegacy"],
        codeExample: `// Before: createAgentLegacy(config)
// After:
const agent = await sdk.createAgent({
  name: 'my-agent',
  model: { provider: 'openai', id: 'gpt-4' },
});`,
        warnings: [
          "Legacy agent creation will no longer work",
          "Update all agent initialization code",
        ],
      },
      {
        order: 2,
        title: "Update Model Configuration",
        description: "Add provider field to model configuration",
        affectedAPIs: ["configureModel", "ModelConfig"],
        codeExample: `// Before: { model: 'gpt-4' }
// After:
{
  model: 'gpt-4',
  provider: 'openai'
}`,
        warnings: ["Missing provider field will cause validation errors"],
      },
    ],
    estimatedEffort: "medium",
    breaking: true,
  },
  {
    fromVersion: "1.0.0" as SDKVersion,
    toVersion: "1.1.0" as SDKVersion,
    steps: [
      {
        order: 1,
        title: "Enable Workflow Checkpointing",
        description: "Add checkpointing configuration to workflow execution",
        affectedAPIs: ["executeWorkflow", "WorkflowConfig"],
        codeExample: `// Before: No checkpointing required
// After:
const result = await workflow.execute({
  plan: myPlan,
  checkpointing: { enabled: true, interval: 5 }
});`,
        warnings: ["Workflows without checkpointing will not support recovery"],
      },
    ],
    estimatedEffort: "low",
    breaking: false,
  },
];

// ============================================================================
// Modernization Analysis Implementations
// ============================================================================

/**
 * Detects the current SDK version from a version string
 * @experimental
 */
export function detectVersion(versionString: string): SemanticVersion {
  return parseVersion(versionString);
}

/**
 * Analyzes dependencies for outdated or breaking changes
 * @experimental
 */
export function analyzeDependencies(
  dependencies: readonly Dependency[]
): DependencyAnalysisResult {
  const outdatedCount = dependencies.filter(
    (dep) =>
      compareVersions(
        parseVersion(dep.currentVersion),
        parseVersion(dep.latestVersion)
      ) < 0
  ).length;

  const breakingCount = dependencies.filter((dep) => dep.isBreaking).length;

  return {
    dependencies,
    outdatedCount,
    breakingCount,
  };
}

/**
 * Generates a migration path from one version to another
 * @experimental
 */
export function generateMigrationPath(
  fromVersion: SDKVersion,
  toVersion: SDKVersion
): MigrationPath | undefined {
  return MIGRATION_PATHS.find(
    (path) => path.fromVersion === fromVersion && path.toVersion === toVersion
  );
}

/**
 * Gets all breaking changes between two versions
 * @experimental
 */
export function getBreakingChanges(
  fromVersion: SemanticVersion,
  toVersion: SemanticVersion
): readonly BreakingChange[] {
  return BREAKING_CHANGES.filter((change) => {
    const changeVersion = parseVersion(change.version);
    return (
      compareVersions(changeVersion, fromVersion) > 0 &&
      compareVersions(changeVersion, toVersion) <= 0
    );
  });
}

/**
 * Performs full compatibility check between current and target versions
 * @experimental
 */
export function checkCompatibility(
  currentVersion: SDKVersion,
  targetVersion: SDKVersion
): CompatibilityCheckResult {
  const current = parseVersion(currentVersion);
  const target = parseVersion(targetVersion);

  const comparison = compareVersions(current, target);

  if (comparison === 0) {
    return {
      isCompatible: true,
      currentVersion,
      targetVersion,
      incompatibilities: [],
      warnings: [],
      recommendations: [],
    };
  }

  if (comparison > 0) {
    return {
      isCompatible: false,
      currentVersion,
      targetVersion,
      incompatibilities: ["Cannot downgrade SDK version"],
      warnings: [],
      recommendations: ["Update to a version >= current version"],
    };
  }

  const breakingChanges = getBreakingChanges(current, target);
  const incompatibilities = breakingChanges.map(
    (change) => `${change.apiName}: ${change.description}`
  );

  const recommendations = breakingChanges.map(
    (change) =>
      `${change.apiName} (v${change.version}): ${change.migrationGuide}`
  );

  return {
    isCompatible: incompatibilities.length === 0,
    currentVersion,
    targetVersion,
    incompatibilities,
    warnings: incompatibilities.length > 0 ? ["Breaking changes detected"] : [],
    recommendations,
  };
}

/**
 * Generates comprehensive modernization analysis
 * @experimental
 */
export function analyzeModernization(
  currentVersion: SDKVersion,
  targetVersion: SDKVersion
): ModernizationAnalysis {
  const current = parseVersion(currentVersion);
  const target = parseVersion(targetVersion);

  return {
    version: currentVersion,
    dependencyAnalysis: analyzeDependencies(SDK_DEPENDENCIES),
    applicableBreakingChanges: getBreakingChanges(current, target),
    compatibilityCheck: checkCompatibility(currentVersion, targetVersion),
    suggestedMigrationPaths: MIGRATION_PATHS.filter(
      (path) =>
        compareVersions(parseVersion(path.fromVersion), current) >= 0 &&
        compareVersions(parseVersion(path.toVersion), target) <= 0
    ),
  };
}

// ============================================================================
// Validation Schema
// ============================================================================

export const VersionSchema = z
  .string()
  .regex(VERSION_REGEX, "Invalid semantic version format");

export const DependencySchema = z.object({
  name: z.string().min(1),
  currentVersion: VersionSchema,
  latestVersion: VersionSchema,
  isBreaking: z.boolean(),
});

export const CompatibilityCheckSchema = z.object({
  isCompatible: z.boolean(),
  currentVersion: VersionSchema,
  targetVersion: VersionSchema,
  incompatibilities: z.array(z.string()),
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const BreakingChangeSchema = z.object({
  version: VersionSchema,
  type: z.enum([
    "API_REMOVAL",
    "API_SIGNATURE_CHANGE",
    "TYPE_CHANGE",
    "BEHAVIOR_CHANGE",
    "DEPENDENCY_UPDATE",
  ]),
  apiName: z.string().min(1),
  description: z.string().min(1),
  migrationGuide: z.string().min(1),
});
