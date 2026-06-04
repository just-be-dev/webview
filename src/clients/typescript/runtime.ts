/**
 * Small runtime shims so the client runs on Node, Deno, and Bun.
 *
 * Everything else in the client uses `node:` builtins (supported by all
 * three runtimes); this module holds the only runtime-conditional code.
 *
 * @module
 */

import os from "node:os";
import process from "node:process";

type DenoGlobal = {
  permissions: {
    querySync(desc: { name: "env"; variable: string }): { state: string };
  };
  env: { get(name: string): string | undefined };
};

const deno: DenoGlobal | undefined = (globalThis as Record<string, unknown>)
  .Deno as DenoGlobal | undefined;

/**
 * Reads an environment variable.
 *
 * On Deno, the permission state is checked first so users who haven't
 * granted `--allow-env` don't get a permission prompt or error — the
 * variable is treated as unset instead.
 */
export function getEnv(name: string): string | undefined {
  if (deno) {
    if (
      deno.permissions.querySync({ name: "env", variable: name }).state !==
        "granted"
    ) {
      return undefined;
    }
    return deno.env.get(name);
  }
  return process.env[name];
}

/** The current OS, normalized to the tokens used for binary selection. */
export function platformOs(): "darwin" | "linux" | "windows" | "unknown" {
  switch (os.platform()) {
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      return "unknown";
  }
}

/** The current CPU architecture, normalized to rust-style tokens. */
export function platformArch(): "aarch64" | "x86_64" | "unknown" {
  switch (os.arch()) {
    case "arm64":
      return "aarch64";
    case "x64":
      return "x86_64";
    default:
      return "unknown";
  }
}
