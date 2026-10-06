import { handlePlannerChat } from "@/flow/planner-chat";

export async function POST(request: Request) {
  return handlePlannerChat(request);
}
