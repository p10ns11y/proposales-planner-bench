import { handlePlannerChat } from "@/flow/planner-chat";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handlePlannerChat(request);
}
