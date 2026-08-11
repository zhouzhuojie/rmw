import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  clean: true,
  // Bundle workspace core so the published binary is self-contained.
  noExternal: ["@rmw/core"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
