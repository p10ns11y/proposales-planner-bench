import { createClient } from "@/proposales/client";
import { openingSnapshot } from "@/flow/chat-request";

export async function GET() {
  const client = createClient();
  const companies = await client.listCompanies();
  return Response.json({ snapshot: openingSnapshot(companies) });
}
