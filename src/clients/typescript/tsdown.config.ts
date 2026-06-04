import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./main.ts"],
  format: ["esm"],
  platform: "neutral",
  dts: { tsconfig: "./tsconfig.npm.json" },
  outDir: "dist",
  external: ["ts-pattern", "type-fest", "zod", /^node:/],
});
