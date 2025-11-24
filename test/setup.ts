import { defineConfig } from "vitest/config";

// Disable Encore test preparation for non-Encore tests
// Encore tests should be run separately from the backend directory
process.env.SKIP_ENCORE_TEST_PREPARE = "true";

// Export the Vitest config
export default defineConfig({});
