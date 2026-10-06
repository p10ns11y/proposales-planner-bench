import { createFixtureClient } from "./fixture-client";
import { createHttpClient } from "./http-client";
import type { ProposalesClient } from "./types";

export type ProposalesMode = "fixture" | "live";

export function resolveMode(env: NodeJS.ProcessEnv = process.env): ProposalesMode {
  if (env.PROPOSALES_MODE === "live") {
    return "live";
  }
  return "fixture";
}

export function createClient(
  env: NodeJS.ProcessEnv = process.env,
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
