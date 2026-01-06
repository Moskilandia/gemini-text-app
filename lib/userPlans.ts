import { setUserPlan as setUserPlanInDb } from "../shared/planStore";

export async function setUserPlan(userId: string, plan: string) {
  await setUserPlanInDb(userId, plan);
}
