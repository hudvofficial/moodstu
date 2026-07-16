import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/forbid-elements": [
        "error",
        {
          "forbid": [
            { "element": "button", "message": "SSOT Violation: Use <Button> from @/components/ui instead of native <button>." },
            { "element": "input", "message": "SSOT Violation: Use <Input> from @/components/ui instead of native <input>." },
            { "element": "textarea", "message": "SSOT Violation: Use <Textarea> from @/components/ui instead of native <textarea>." },
            { "element": "select", "message": "SSOT Violation: Use <Select> from @/components/ui instead of native <select>." }
          ]
        }
      ],
      "no-restricted-syntax": [
        "error",
        {
          "selector": "JSXAttribute[name.name='className'] Literal[value=/\\b(text|bg|shadow|border|ring|rounded)-\\[/]",
          "message": "SSOT Violation: Arbitrary Tailwind values like text-[...], shadow-[...] are strictly forbidden. Use semantic tokens from components.css instead."
        },
        {
          "selector": "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\b(text|bg|shadow|border|ring|rounded)-\\[/]",
          "message": "SSOT Violation: Arbitrary Tailwind values like text-[...], shadow-[...] are strictly forbidden. Use semantic tokens from components.css instead."
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
    "public/sw.js.map",
    "public/workbox-*.js",
    "public/workbox-*.js.map",
    "public/fallback-*.js",
    "public/fallback-*.js.map",
    "public/swe-worker-*.js",
    "public/swe-worker-*.js.map",
    "tmp/**",
    // Artifact của Playwright: bundle của THƯ VIỆN (trace viewer), không phải code mình.
    // Đã gitignore (.gitignore:15-16) + không git track → CI (checkout sạch) không bao giờ thấy.
    // Không ignore ở đây thì `npx eslint .` local phình 195 lỗi / 2779 warning trong khi nợ
    // THẬT chỉ ~30 → nhiễu đó khiến lỗi thật trông như hạt cát và dễ bị bỏ qua.
    "playwright-report/**",
    "test-results/**",
    ".openclaw/**",
    "*.js",
    "test-query-*.mjs",
    "scripts/**",
  ]),
]);

export default eslintConfig;
