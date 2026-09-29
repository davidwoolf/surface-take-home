import path from "node:path";
import { defineConfig } from "vitest/config";

const handbookTests = "src/modules/knowledgebase/__tests__/handbook/**";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "default",
          environment: "node",
          exclude: ["**/node_modules/**", handbookTests],
        },
      },
      {
        extends: true,
        test: {
          name: "handbook",
          environment: "node",
          include: [`${handbookTests}/*.test.ts`],
        },
      },
    ],
  },
});
