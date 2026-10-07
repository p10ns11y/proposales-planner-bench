import { describe, expect, it } from "vitest";
import {
  defaultPlannerModelId,
  modelAttemptMs,
  modelAttemptSignal,
  modelIsUsable,
  plannerModelChoice,
  resolveBriefPatch,
} from "../src/flow/agent-mode";
import { completeChatTurn, currentChatEnv } from "../src/flow/planner-chat";
import { openingSnapshot } from "../src/flow/chat-request";
import { createFixtureClient } from "../src/proposales/fixture-client";

const stockholm = "I need a place in Stockholm for 40 people on 12 November 2026.";
const presentKey = "present";

describe("model and scripted switch", () => {
  it("stays scripted when no xAI key is set", () => {
    expect(modelIsUsable({})).toBe(false);
    expect(modelIsUsable({ XAI_API_KEY: "" })).toBe(false);
    withEnv({ VERCEL: "1", VERCEL_OIDC_TOKEN: presentKey, XAI_API_KEY: undefined }, () => {
      expect(modelIsUsable(currentChatEnv())).toBe(false);
    });
  });

  it("selects xAI and the default model when a key is set", () => {
    expect(modelIsUsable({ XAI_API_KEY: presentKey })).toBe(true);
    expect(plannerModelChoice({ XAI_API_KEY: presentKey })).toEqual({
      provider: "xai",
      modelId: defaultPlannerModelId,
    });
    expect(defaultPlannerModelId).toBe("grok-4.7");
  });

  it("lets PLANNER_MODEL override the xAI model id", () => {
    expect(
      plannerModelChoice({
        XAI_API_KEY: presentKey,
        PLANNER_MODEL: "grok-4.6",
      }),
    ).toEqual({
      provider: "xai",
      modelId: "grok-4.6",
    });
  });

  it("keeps the scripted patch when the model throws", async () => {
    const patch = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => {
        throw new Error("model down");
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
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => {
        calls += 1;
        return { city: "Oslo", organisationName: "Northwind" };
      },
    });
    expect(calls).toBe(1);
    expect(patch.city).toBe("Stockholm");
    expect(patch.organisationName).toBe("Northwind");
  });

  it("does not call the model when no xAI key is set", async () => {
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
      env: { XAI_API_KEY: presentKey },
      runLive: async () => {
        throw new Error("model down");
      },
    });
    expect(turn.mode).toBe("scripted");
    expect(turn.snapshot.brief.city).toBe("Stockholm");
    expect(turn.reply.length).toBeGreaterThan(0);
  });

  it(
    "aborts a model attempt within about eight seconds",
    async () => {
      expect(modelAttemptMs).toBe(8_000);
      const started = Date.now();
      const signal = modelAttemptSignal();
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener("abort", () => resolve(), { once: true });
        setTimeout(() => reject(new Error("model attempt ran long")), 9_000);
      });
      const elapsed = Date.now() - started;
      expect(elapsed).toBeGreaterThanOrEqual(7_500);
      expect(elapsed).toBeLessThanOrEqual(8_500);
    },
    12_000,
  );
});

function withEnv(values: Record<string, string | undefined>, run: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const name of Object.keys(values)) {
    previous.set(name, process.env[name]);
    const next = values[name];
    if (next === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = next;
    }
  }
  try {
    run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}
