import { describe, expect, it } from "vitest";
import { GET } from "../src/app/api/session/route";
import {
  clientCompanyFields,
  companiesForClient,
  companyForClient,
} from "../src/flow/client-company";
import { emptySnapshot, snapshotForClient } from "../src/flow/planner-snapshot";
import { handlePlannerChat } from "../src/flow/planner-chat";
import { handlePlannerTurn } from "../src/flow/planner-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";

const allowedFields = ["id", "name"] as const;

describe("client snapshot", () => {
  it("client snapshot carries only allow-listed fields", async () => {
    expect([...clientCompanyFields]).toEqual([...allowedFields]);
    const source = await createFixtureClient().listCompanies();
    const first = source[0];
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }
    expect(Object.keys(first).length).toBeGreaterThan(allowedFields.length);
    const widened = { ...first, region: "north" };
    const listed = companyForClient(widened);
    expect(Object.keys(listed).sort()).toEqual([...allowedFields].sort());
    expect(listed).toEqual({ id: first.id, name: first.name });
    expect(companiesForClient(source.map((company) => ({ ...company, region: "north" })))).toEqual(
      source.map((company) => ({ id: company.id, name: company.name })),
    );

    const opened = emptySnapshot(source, "", []);
    expectAllowListed(opened.companies, source);
    const projected = snapshotForClient({ ...opened, companies: source });
    expectAllowListed(projected.companies, source);

    const session = await withFixtureMode(async () => {
      const response = await GET();
      const payload: unknown = await response.json();
      return payload;
    });
    expectAllowListed(readCompanies(session), source);

    const roundTrip = await handlePlannerTurn(
      new Request("http://planner-bench.test/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: { type: "rowClosed" },
          snapshot: { ...opened, companies: source.map((company) => ({ ...company, region: "north" })) },
        }),
      }),
      { env: { PROPOSALES_MODE: "fixture" } },
    );
    expectAllowListed(readCompanies(await roundTrip.json()), source);
    expect(roundTrip.status).toBe(200);

    const chat = await handlePlannerChat(
      new Request("http://planner-bench.test/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", text: "hello" }] }),
      }),
      { PROPOSALES_MODE: "fixture" },
    );
    expect(chat.status).toBe(200);
    expectAllowListed(companiesFromStream(await chat.text()), source);
  });
});

function expectAllowListed(
  companies: readonly object[],
  source: readonly { id: number; name: string }[],
): void {
  expect(companies).toHaveLength(source.length);
  companies.forEach((company, index) => {
    const origin = source[index];
    expect(Object.keys(company).sort()).toEqual([...allowedFields].sort());
    expect(company).toEqual({ id: origin?.id, name: origin?.name });
  });
}

function readCompanies(payload: unknown): object[] {
  const nested = companiesOf(payload);
  if (nested.length > 0) {
    return nested;
  }
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  return companiesOf(Reflect.get(payload, "data"));
}

function companiesOf(payload: unknown): object[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }
  const snapshot = Reflect.get(payload, "snapshot");
  const record = typeof snapshot === "object" && snapshot !== null ? snapshot : payload;
  const companies = Reflect.get(record, "companies");
  if (!Array.isArray(companies)) {
    return [];
  }
  return companies.flatMap((company) => {
    if (typeof company !== "object" || company === null || Array.isArray(company)) {
      return [];
    }
    return [company];
  });
}

function companiesFromStream(text: string): object[] {
  const found: object[] = [];
  for (const line of text.split("\n")) {
    const payload = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
    if (!payload.startsWith("{")) {
      continue;
    }
    try {
      const value: unknown = JSON.parse(payload);
      found.push(...readCompanies(value));
    } catch {
      continue;
    }
  }
  return found;
}

async function withFixtureMode<T>(run: () => Promise<T>): Promise<T> {
  const previous = process.env.PROPOSALES_MODE;
  process.env.PROPOSALES_MODE = "fixture";
  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env.PROPOSALES_MODE;
    } else {
      process.env.PROPOSALES_MODE = previous;
    }
  }
}
