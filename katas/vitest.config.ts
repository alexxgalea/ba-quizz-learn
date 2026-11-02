import { defineConfig } from "vitest/config";

// Doar testele TS / TSX; testele .mjs rulează cu `node --test`.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["*.test.ts", "*.test.tsx"],
  },
});
