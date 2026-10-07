import { readSessionSnapshot } from "@/flow/chat-request";
import { createClient } from "@/proposales/client";

export async function GET() {
  const snapshot = await readSessionSnapshot(createClient());
  return Response.json({ snapshot });
}
