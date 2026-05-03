import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{js,mjs,ts}"],
    globals: false,
    reporters: process.env.CI ? ["default"] : ["verbose"],
    // Default `threads` pool spawns tinypool workers that intermittently fail
    // with "spawn UNKNOWN" on Windows once the suite grows past a few files
    // (suspected Defender / AV scanner racing the worker fork). `forks` with
    // serial execution is slower but reliable across platforms.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    fileParallelism: false,
  },
});
