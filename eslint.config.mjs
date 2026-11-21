import js from "@eslint/js";

/**
 * Lightweight ESLint setup.
 *
 * `eslint-config-next` currently pulls in typescript-eslint, which does not
 * support TypeScript 7.x yet (this repo pins typescript@7.0.2). Type-correctness
 * is enforced separately via `npm run typecheck` (tsc --noEmit), so ESLint here
 * focuses on JS/JSX source-quality rules without the TS parser.
 */
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "legacy/**",
      "out/**",
      "*.min.js",
      // .ts/.tsx are excluded from ESLint: typescript-eslint does not support
      // the TypeScript 7.x toolchain pinned in this repo. Type safety for these
      // files is enforced by `npm run typecheck` (tsc --noEmit).
      "**/*.ts",
      "**/*.tsx",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.jsx", "**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        React: "readonly",
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        console: "readonly",
        crypto: "readonly",
        FormData: "readonly",
        File: "readonly",
        Blob: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        MutationObserver: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        alert: "readonly",
        confirm: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        process: "readonly",
        module: "writable",
        require: "writable",
        __dirname: "readonly",
        Buffer: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        WebSocket: "readonly",
        matchMedia: "readonly",
        getComputedStyle: "readonly",
        THREE: "readonly",
      },
    },
    rules: {
      // The base ESLint rule does not count JSX component tags as variable
      // references; uppercase bindings are generally JSX components/types.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z]" }],
      "no-undef": "error",
      eqeqeq: ["warn", "smart"],
    },
  },
];
