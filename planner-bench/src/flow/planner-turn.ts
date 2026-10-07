import { plannerBriefSchema, type PlannerBrief } from "../domain/planner-brief";
import { createClient } from "../proposales/client";
import { resolveBriefPatch, type PlannerPath } from "./agent-mode";
import { readSessionSnapshot } from "./chat-request";
import { moreDetailsSchema } from "./more-details";
import { currentChatEnv, type PlannerChatEnv } from "./planner-chat";
import { plannerSnapshotSchema, snapshotForClient } from "./planner-snapshot";
import { runViewportAction, type ViewportAction } from "./viewport-turn";

export async function handlePlannerTurn(
  request: Request,
  options?: {
    env?: PlannerChatEnv;
    extractWithModel?: (text: string, brief: PlannerBrief) => Promise<PlannerBrief>;
  },
): Promise<Response> {
  const payload: unknown = await request.json();
  if (typeof payload !== "object" || payload === null) {
    return Response.json({ error: "Turn request must be an object." }, { status: 400 });
  }
  const action = readAction(Reflect.get(payload, "action"));
  if (action === null) {
    return Response.json({ error: "Unknown turn action." }, { status: 400 });
  }
  const env = options?.env ?? currentChatEnv();
  const client = createClient(env);
  const today = new Date().toISOString().slice(0, 10);
  const snapshotValue = Reflect.get(payload, "snapshot");
  const snapshot =
    snapshotValue === undefined || snapshotValue === null
      ? await readSessionSnapshot(client)
      : plannerSnapshotSchema.parse(snapshotValue);
  let planner: PlannerPath = "scripted";
  const result = await runViewportAction({
    action,
    snapshot,
    client,
    today,
    readPatch: async (text, brief) => {
      const resolved = await resolveBriefPatch({
        text,
        brief,
        env,
        extractWithModel: options?.extractWithModel,
      });
      planner = resolved.planner;
      return resolved.brief;
    },
  });
  return Response.json({ snapshot: snapshotForClient(result.snapshot), planner });
}

function readAction(value: unknown): ViewportAction | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const type = Reflect.get(value, "type");
  if (
    type === "captureSubmitted" ||
    type === "composerSubmitted" ||
    type === "gapAnswered" ||
    type === "favoritesSubmitted"
  ) {
    const text = Reflect.get(value, "text");
    if (typeof text !== "string") {
      return null;
    }
    return { type, text };
  }
  if (type === "moreEdited") {
    const parsed = moreDetailsSchema.safeParse(Reflect.get(value, "details"));
    if (!parsed.success) {
      return null;
    }
    return { type: "moreEdited", details: parsed.data };
  }
  if (type === "briefEdited") {
    const briefValue = Reflect.get(value, "brief");
    const parsed = plannerBriefSchema.safeParse(briefValue);
    if (!parsed.success) {
      return null;
    }
    return { type: "briefEdited", brief: parsed.data };
  }
  if (type === "briefConfirmed") {
    const briefValue = Reflect.get(value, "brief");
    if (briefValue === undefined) {
      return { type: "briefConfirmed" };
    }
    const parsed = plannerBriefSchema.safeParse(briefValue);
    if (!parsed.success) {
      return null;
    }
    return { type: "briefConfirmed", brief: parsed.data };
  }
  if (type === "showMore" || type === "rowClosed") {
    return { type };
  }
  if (type === "rowOpened") {
    const venueName = Reflect.get(value, "venueName");
    if (typeof venueName !== "string") {
      return null;
    }
    return { type: "rowOpened", venueName };
  }
  return null;
}
