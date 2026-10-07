import { describe, expect, it } from "vitest";
import { gatewayIsUsable, resolveBriefPatch } from "../src/flow/agent-mode";
import { completeChatTurn } from "../src/flow/planner-chat";
import { openingSnapshot } from "../src/flow/chat-request";
import { createFixtureClient } from "../src/proposales/fixture-client";

const stockholm = "I need a place in Stockholm for 40 people on 12 November 2026.";

describe("model and scripted switch", () => {
  it("stays scripted when no gateway credential exists", () => {
    expect(gatewayIsUsable({})).toBe(false);
    expect(gatewayIsUsable({ AI_GATEWAY_API_KEY: "" })).toBe(false);
    expect(gatewayIsUsable({ VERCEL: "0" })).toBe(false);
  });

  it("treats an API key, an OIDC token, or a Vercel runtime as a usable gateway", () => {
    expect(gatewayIsUsable({ AI_GATEWAY_API_KEY: "test-key" })).toBe(true);
    expect(gatewayIsUsable({ VERCEL_OIDC_TOKEN: "test-token" })).toBe(true);
    expect(gatewayIsUsable({ VERCEL: "1" })).toBe(true);
  });

  it("keeps the scripted patch when the gateway throws", async () => {
    const patch = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: { VERCEL_OIDC_TOKEN: "test-token" },
      extractWithModel: async () => {
        throw new Error("gateway down");
      },
    });
    expect(patch.city).toBe("Stockholm");
    expect(patch.attendeeCount).toBe(40);
    expect(patch.startDate).toBe("2026-11-12");
  });

  it("lets the model fill a fact the scripted pass missed, without replacing one it found", async () => {
    let calls = 0;
    const patch = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: { AI_GATEWAY_API_KEY: "test-key" },
      extractWithModel: async () => {
        calls += 1;
        return { city: "Oslo", organisationName: "Northwind" };
      },
    });
    expect(calls).toBe(1);
    expect(patch.city).toBe("Stockholm");
    expect(patch.organisationName).toBe("Northwind");
  });

  it("does not call the model when the gateway is not usable", async () => {
    let calls = 0;
    await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: {},
      extractWithModel: async () => {
        calls += 1;
        return { city: "Oslo" };
      },
    });
    expect(calls).toBe(0);
  });

  it("falls back to the scripted reply when the live model throws", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    const turn = await completeChatTurn({
      messages: [{ role: "user", text: stockholm }],
      snapshot,
      client,
      today: "2026-10-06",
      env: { VERCEL: "1" },
      runLive: async () => {
        throw new Error("gateway down");
      },
    });
    expect(turn.mode).toBe("scripted");
    expect(turn.snapshot.brief.city).toBe("Stockholm");
    expect(turn.reply.length).toBeGreaterThan(0);
  });
});
