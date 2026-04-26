import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Post-build rewrite: swap every `@miden-sdk/{miden-sdk,react}/lazy` import in
 * the eager bundles to the bare specifier. Mirrors the pattern in
 * `@miden-sdk/react/tsup.config.ts` so a consumer's choice of eager vs lazy
 * cascades through the adapter without forcing a different WASM init mode
 * than the rest of their app.
 *
 * Source always imports from the `/lazy` subpaths; the lazy bundle ships
 * unchanged, the eager bundle has those subpaths rewritten away.
 */
function rewriteEagerBundles(distDir: string): void {
  for (const file of ["index.js", "index.cjs"]) {
    const path = join(distDir, file);
    let before: string;
    try {
      before = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const after = before
      .replace(/@miden-sdk\/miden-sdk\/lazy/g, "@miden-sdk/miden-sdk")
      .replace(/@miden-sdk\/react\/lazy/g, "@miden-sdk/react");
    if (after !== before) {
      writeFileSync(path, after);
    }
  }
}

export default defineConfig([
  // Eager variant — default entry (`@miden-sdk/miden-wallet-adapter-react`).
  {
    entry: { index: "index.ts" },
    format: ["cjs", "esm"],
    outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
    dts: true,
    clean: true,
    external: [
      "@miden-sdk/react",
      "@miden-sdk/react/lazy",
      "@miden-sdk/miden-sdk",
      "@miden-sdk/miden-sdk/lazy",
      "@miden-sdk/miden-wallet-adapter-base",
      "@miden-sdk/miden-wallet-adapter-miden",
      "react",
    ],
    onSuccess: async () => {
      rewriteEagerBundles("dist");
    },
  },
  // Lazy variant — subpath entry (`.../lazy`).
  {
    entry: { lazy: "index.ts" },
    format: ["cjs", "esm"],
    outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
    dts: true,
    clean: false,
    external: [
      "@miden-sdk/react",
      "@miden-sdk/react/lazy",
      "@miden-sdk/miden-sdk",
      "@miden-sdk/miden-sdk/lazy",
      "@miden-sdk/miden-wallet-adapter-base",
      "@miden-sdk/miden-wallet-adapter-miden",
      "react",
    ],
  },
]);
