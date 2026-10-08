import { handlePlannerTurn } from "@/flow/planner-turn";

export const maxDuration = 60;

export async function POST(request: Request) {
  return handlePlannerTurn(request);
}
