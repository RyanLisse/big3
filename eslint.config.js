import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js"],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off", 
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];