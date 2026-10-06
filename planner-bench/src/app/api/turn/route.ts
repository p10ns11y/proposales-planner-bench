import { handlePlannerTurn } from "@/flow/planner-turn";

export async function POST(request: Request) {
  return handlePlannerTurn(request);
}
