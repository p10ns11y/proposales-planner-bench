import { readSessionSnapshot } from "@/flow/chat-request";
import { snapshotForClient } from "@/flow/planner-snapshot";
import { createClient } from "@/proposales/client";

export async function GET() {
  const snapshot = snapshotForClient(await readSessionSnapshot(createClient()));
  return Response.json({ snapshot });
}
