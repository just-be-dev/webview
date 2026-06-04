/**
 * Synchronizes version numbers across the project:
 * - Updates BIN_VERSION in TypeScript client (main.ts)
 * - Keeps the TypeScript client's package.json version in sync with deno.json
 * - Updates package version in Python client (pyproject.toml)
 * - Updates BIN_VERSION in Python client (__init__.py)
 *
 * All versions are synchronized with the main version from Cargo.toml
 */

import { parse } from "jsr:@std/toml";

// Read the source version from Cargo.toml
const latestVersion = await Deno
  .readTextFile("./Cargo.toml").then((text) =>
    parse(text) as { package: { version: string } }
  ).then((config) => config.package.version);

// ===== Update TypeScript Client Version =====
const tsClientPath = "./src/clients/typescript/main.ts";
const tsClientContent = await Deno.readTextFile(tsClientPath);

const updatedTsClientContent = tsClientContent.replace(
  /const BIN_VERSION = "[^"]+"/,
  `const BIN_VERSION = "${latestVersion}"`,
);

await Deno.writeTextFile(tsClientPath, updatedTsClientContent);
console.log(`✓ Updated TypeScript BIN_VERSION to ${latestVersion}`);

// ===== Sync TypeScript package.json version with deno.json =====
// The JSR (deno.json) and npm (package.json) manifests must always publish
// the same package version; deno.json is the source of truth.
const denoJsonPath = "./src/clients/typescript/deno.json";
const packageJsonPath = "./src/clients/typescript/package.json";
const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath)) as {
  version: string;
};
const packageJsonContent = await Deno.readTextFile(packageJsonPath);
const updatedPackageJsonContent = packageJsonContent.replace(
  /"version": "[^"]+"/,
  `"version": "${denoJson.version}"`,
);
await Deno.writeTextFile(packageJsonPath, updatedPackageJsonContent);
console.log(`✓ Synced TypeScript package.json version to ${denoJson.version}`);

// ===== Update Python Client BIN_VERSION =====
const pythonInitPath = "./src/clients/python/src/justbe_webview/__init__.py";
const pythonInitContent = await Deno.readTextFile(pythonInitPath);

const updatedPythonInitContent = pythonInitContent.replace(
  /BIN_VERSION = "[^"]+"/,
  `BIN_VERSION = "${latestVersion}"`,
);

await Deno.writeTextFile(pythonInitPath, updatedPythonInitContent);
console.log(`✓ Updated Python BIN_VERSION to ${latestVersion}`);

console.log(`\n🎉 Successfully synchronized all versions to ${latestVersion}`);
