import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: vi.fn(() => {
      throw new Error("model skipped");
    }),
  };
});

import { streamText } from "ai";
import { openingSnapshot } from "../src/flow/chat-request";
import { completeChatTurn } from "../src/flow/planner-chat";
import { createFixtureClient } from "../src/proposales/fixture-client";

describe("chat instructions", () => {
  beforeEach(() => {
    vi.mocked(streamText).mockClear();
  });

  it("says the user can press File and does not claim it will send or file", async () => {
    const client = createFixtureClient();
    const snapshot = openingSnapshot(await client.listCompanies());
    await completeChatTurn({
      messages: [{ role: "user", text: "Send it to the first company" }],
      snapshot,
      client,
      today: "2026-10-08",
      env: { XAI_API_KEY: "present" },
    });
    expect(vi.mocked(streamText)).toHaveBeenCalled();
    const settings = vi.mocked(streamText).mock.calls[0]?.[0];
    const system = typeof settings?.system === "string" ? settings.system : "";
    expect(system).toMatch(/Never claim you will send or file/);
    expect(system).toContain("press File");
    expect(system).not.toContain("I'll send it to the first company now");
  });
});
