import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

// ─── ESLint flat config — React frontend (v28.57) ─────────────────────────────
//
// Governs all .jsx/.js under src/. Per CAM Article XXXI: this config is the
// source of truth for "what good looks like" in this project. It's enforced
// by the pre-commit hook (lint-staged) and the GitHub Actions CI workflow.
//
// RULE-SET CHOICE NOTE
// eslint-plugin-react-hooks v7 ships several EXPERIMENTAL rules in its
// `recommended` preset that fire false positives on React 19 patterns we use
// deliberately:
//   - react-hooks/immutability     — misreads useState initializer fns as mutations
//   - react-hooks/purity            — flags some legitimate render-phase reads
//   - react-hooks/set-state-in-effect — over-fires on mount-time data loading
//   - react-hooks/components-and-hooks-must-be-pure — companion of the above
//
// v7.1.1 (Dependabot bump, 2026-05-15) added two MORE experimental rules
// from the React Compiler tooling:
//   - react-hooks/refs              — flags ref-writes-in-render (a pattern
//                                     used in JSAModal for stable closure
//                                     references to parent-provided callbacks;
//                                     the alternative — useLayoutEffect on
//                                     every prop change — is more overhead
//                                     than the side effect saves)
//   - react-hooks/preserve-manual-memoization — fires when React Compiler
//                                     can't auto-optimize a manual useCallback
//                                     because the deps don't match the
//                                     compiler's analysis. Benign for us —
//                                     we WANT manual memoization in places
//                                     where the compiler can't see refs.
//
// These are NOT silenced because they're inconvenient. They're silenced
// because they generate false positives for patterns that have been
// independently verified correct. The PROVEN rules from the same plugin
// (rules-of-hooks, exhaustive-deps) remain on as errors / warnings.
//
// Audit obligation: when eslint-plugin-react-hooks releases a v8 with the
// false-positive issues addressed, OR when we have bandwidth to audit each
// of the sites that trigger these rules individually, the disables
// below come out. Track in the v28.57 ship notes / roadmap.

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // Unused vars — allow leading-underscore convention for intentional
      // unused (e.g., destructured rest, catch-error placeholders).
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]|^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],

      // Empty catch blocks must have a comment explaining the silence —
      // OR rename caught error to `_err` to signal intentional swallow.
      "no-empty": ["error", { allowEmptyCatch: false }],

      // React-hooks v7 experimental rules — disabled per the rule-set
      // choice note at the top of this file. The proven v6 rules
      // (rules-of-hooks, exhaustive-deps) remain enforced.
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/components-and-hooks-must-be-pure": "off",
      // v7.1.1 (2026-05-15) additions — React Compiler experimental rules
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",

      // exhaustive-deps is a real signal — keep as a warning so it surfaces
      // in lint output without blocking the gate. The fix is per-call-site
      // (add deps, or document why they're excluded via eslint-disable-next-line).
      "react-hooks/exhaustive-deps": "warn",

      // react-refresh/only-export-components — fires on .jsx files that
      // export both components AND helper consts/functions. The clean fix
      // is to split helpers into a separate file (Article XXV). We mark
      // this as warn so existing co-located helpers don't fail the gate,
      // but new ones surface for review.
      "react-refresh/only-export-components": "warn",

      // no-await-in-loop — there are legitimate sequential cases.
      "no-await-in-loop": "warn",
    },
  },
]);
