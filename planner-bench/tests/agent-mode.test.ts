import { describe, expect, it } from "vitest";
import { maxDuration } from "../src/app/api/turn/route";
import {
  briefExtractionProviderOptions,
  defaultPlannerModelId,
  modelAttemptMs,
  modelAttemptSignal,
  modelIsUsable,
  plannerModelChoice,
  resolveBriefPatch,
} from "../src/flow/agent-mode";
import { completeChatTurn, currentChatEnv } from "../src/flow/planner-chat";
import { handlePlannerTurn } from "../src/flow/planner-turn";
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
    const resolved = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => {
        throw new Error("model down");
      },
    });
    expect(resolved.planner).toBe("scripted");
    expect(resolved.brief.city).toBe("Stockholm");
    expect(resolved.brief.attendeeCount).toBe(40);
    expect(resolved.brief.startDate).toBe("2026-11-12");
  });

  it("lets the model fill a fact the scripted pass missed, without replacing one it found", async () => {
    let calls = 0;
    const resolved = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => {
        calls += 1;
        return { city: "Oslo", organisationName: "Northwind" };
      },
    });
    expect(calls).toBe(1);
    expect(resolved.planner).toBe("model");
    expect(resolved.brief.city).toBe("Stockholm");
    expect(resolved.brief.organisationName).toBe("Northwind");
  });

  it("does not call the model when no xAI key is set", async () => {
    let calls = 0;
    const resolved = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: {},
      extractWithModel: async () => {
        calls += 1;
        return { city: "Oslo" };
      },
    });
    expect(calls).toBe(0);
    expect(resolved.planner).toBe("scripted");
    expect(resolved.brief.city).toBe("Stockholm");
  });

  it("keeps the scripted patch when the model brief fails the schema", async () => {
    const resolved = await resolveBriefPatch({
      text: stockholm,
      brief: {},
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => ({ attendeeCount: 1.5 }),
    });
    expect(resolved.planner).toBe("scripted");
    expect(resolved.brief.attendeeCount).toBe(40);
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

  it("asks the extraction call for low reasoning effort", () => {
    expect(briefExtractionProviderOptions.xai.reasoningEffort).toBe("low");
  });

  it("gives the turn route enough time for the model window", () => {
    expect(modelAttemptMs).toBe(20_000);
    expect(maxDuration).toBe(60);
    expect(maxDuration * 1_000).toBeGreaterThan(modelAttemptMs);
  });

  it("names the planner path on the turn response", async () => {
    const modelResponse = await handlePlannerTurn(turnRequest(stockholm), {
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => ({ organisationName: "Northwind" }),
    });
    expect(modelResponse.status).toBe(200);
    expect(await modelResponse.json()).toMatchObject({
      planner: "model",
      snapshot: { brief: { city: "Stockholm", organisationName: "Northwind" } },
    });

    const scriptedResponse = await handlePlannerTurn(turnRequest(stockholm), {
      env: { XAI_API_KEY: presentKey },
      extractWithModel: async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    });
    expect(scriptedResponse.status).toBe(200);
    expect(await scriptedResponse.json()).toMatchObject({
      planner: "scripted",
      snapshot: { brief: { city: "Stockholm" } },
    });

    const missingKey = await handlePlannerTurn(turnRequest(stockholm), { env: {} });
    expect(missingKey.status).toBe(200);
    expect(await missingKey.json()).toMatchObject({
      planner: "scripted",
      snapshot: { brief: { city: "Stockholm" } },
    });
  });

  it(
    "falls back to the scripted patch after the model window",
    async () => {
      expect(modelAttemptMs).toBe(20_000);
      const started = Date.now();
      const resolved = await resolveBriefPatch({
        text: stockholm,
        brief: {},
        env: { XAI_API_KEY: presentKey },
        extractWithModel: () =>
          new Promise((_, reject) => {
            const signal = modelAttemptSignal();
            signal.addEventListener(
              "abort",
              () => {
                reject(signal.reason);
              },
              { once: true },
            );
          }),
      });
      const elapsed = Date.now() - started;
      expect(elapsed).toBeGreaterThanOrEqual(19_000);
      expect(elapsed).toBeLessThanOrEqual(23_000);
      expect(resolved.planner).toBe("scripted");
      expect(resolved.brief.city).toBe("Stockholm");
      expect(resolved.brief.attendeeCount).toBe(40);
      expect(resolved.brief.startDate).toBe("2026-11-12");
    },
    30_000,
  );
});

function turnRequest(text: string): Request {
  return new Request("http://planner-bench.test/api/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: { type: "captureSubmitted", text },
    }),
  });
}

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
