import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack"], location: "anywhere" }],
    },
  },
  {
    files: ["src/views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/domain", "@/domain/**", "**/domain", "**/domain/**"],
              message: "Views render view-models only.",
            },
            {
              group: ["@/proposales", "@/proposales/**", "**/proposales", "**/proposales/**"],
              message: "Views render view-models only.",
            },
            {
              group: ["@/flow", "@/flow/**", "**/flow", "**/flow/**"],
              message: "Views render view-models only.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
