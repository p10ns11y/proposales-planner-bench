import { createFixtureClient } from "./fixture-client";
import { createHttpClient } from "./http-client";
import type { ProposalesClient } from "./types";

export type ProposalesMode = "fixture" | "live";

export type ProposalesEnv = {
  PROPOSALES_MODE?: string;
  PROPOSALES_API_KEY?: string;
};

function envValue(name: string): string | undefined {
  if (!Object.hasOwn(process.env, name)) {
    return undefined;
  }
  const value: unknown = Reflect.get(process.env, name);
  return typeof value === "string" ? value : undefined;
}

function currentProposalesEnv(): ProposalesEnv {
  return {
    PROPOSALES_MODE: envValue("PROPOSALES_MODE"),
    PROPOSALES_API_KEY: envValue("PROPOSALES_API_KEY"),
  };
}

export function resolveMode(env: ProposalesEnv = currentProposalesEnv()): ProposalesMode {
  if (env.PROPOSALES_MODE === "live") {
    return "live";
  }
  return "fixture";
}

export function createClient(
  env: ProposalesEnv = currentProposalesEnv(),
  fetchImpl?: typeof fetch,
): ProposalesClient {
  if (resolveMode(env) === "fixture") {
    return createFixtureClient();
  }
  const apiKey = env.PROPOSALES_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error("PROPOSALES_API_KEY is required when PROPOSALES_MODE=live");
  }
  return createHttpClient({ apiKey, fetchImpl });
}
