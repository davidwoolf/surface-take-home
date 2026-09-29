import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// Placeholder until M1 adds real knowledgebase tests; proves module tests and the @ alias run.
describe("module test setup", () => {
  it("resolves the @ alias", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
