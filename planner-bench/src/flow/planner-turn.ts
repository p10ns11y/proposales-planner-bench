import { createClient } from "../proposales/client";
import { plannerBriefSchema } from "../domain/planner-brief";
import { currentChatEnv } from "./planner-chat";
import { openingSnapshot } from "./chat-request";
import { plannerSnapshotSchema } from "./planner-snapshot";
import { runViewportAction, type ViewportAction } from "./viewport-turn";

export async function handlePlannerTurn(request: Request): Promise<Response> {
  const payload: unknown = await request.json();
  if (typeof payload !== "object" || payload === null) {
    return Response.json({ error: "Turn request must be an object." }, { status: 400 });
  }
  const action = readAction(Reflect.get(payload, "action"));
  if (action === null) {
    return Response.json({ error: "Unknown turn action." }, { status: 400 });
  }
  const client = createClient(currentChatEnv());
  const today = new Date().toISOString().slice(0, 10);
  const snapshotValue = Reflect.get(payload, "snapshot");
  const companies =
    snapshotValue === undefined || snapshotValue === null
      ? await client.listCompanies()
      : plannerSnapshotSchema.parse(snapshotValue).companies;
  const snapshot =
    snapshotValue === undefined || snapshotValue === null
      ? openingSnapshot(companies)
      : plannerSnapshotSchema.parse(snapshotValue);
  const result = await runViewportAction({
    action,
    snapshot,
    client,
    today,
  });
  return Response.json({ snapshot: result.snapshot });
}

function readAction(value: unknown): ViewportAction | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const type = Reflect.get(value, "type");
  if (type === "captureSubmitted" || type === "gapAnswered" || type === "favoritesSubmitted") {
    const text = Reflect.get(value, "text");
    if (typeof text !== "string") {
      return null;
    }
    return { type, text };
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
