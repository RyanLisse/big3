import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "**/*.d.ts",
      "**/*.js.map",
    ],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        fetch: "readonly",
        WebSocket: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
