import { describe, expect, it } from "vitest";
import { modelIdFor, selectProvider } from "../providers";

describe("selectProvider", () => {
  it("asks for setup when no key is set", () => {
    const result = selectProvider({ ANTHROPIC_API_KEY: "  " });
    expect(result.status).toBe("none");
    if (result.status === "none") expect(result.message).toContain("ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY");
  });

  it("uses the only configured provider", () => {
    expect(selectProvider({ OPENAI_API_KEY: "k" })).toEqual({ status: "selected", provider: "openai" });
  });

  it("asks the user to choose when several keys are set", () => {
    expect(selectProvider({ ANTHROPIC_API_KEY: "a", GOOGLE_GENERATIVE_AI_API_KEY: "g" })).toEqual({
      status: "choose",
      options: ["anthropic", "google"],
    });
  });

  it("honors SURFACE_PROVIDER when its key is set", () => {
    expect(selectProvider({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", SURFACE_PROVIDER: "openai" })).toEqual({
      status: "selected",
      provider: "openai",
    });
  });

  it("rejects an unknown SURFACE_PROVIDER or one without a key", () => {
    expect(selectProvider({ SURFACE_PROVIDER: "mistral" }).status).toBe("invalid");
    const missingKey = selectProvider({ ANTHROPIC_API_KEY: "a", SURFACE_PROVIDER: "google" });
    expect(missingKey).toMatchObject({ status: "invalid", message: expect.stringContaining("GOOGLE_GENERATIVE_AI_API_KEY") });
  });
});

describe("modelIdFor", () => {
  it("uses the default model unless overridden", () => {
    expect(modelIdFor("anthropic", {})).toBe("claude-sonnet-5-5");
    expect(modelIdFor("anthropic", { ANTHROPIC_MODEL: " claude-opus-5-5 " })).toBe("claude-opus-5-5");
  });
});
