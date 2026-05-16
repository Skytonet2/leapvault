import "server-only";

import type { Task } from "@/types/task";
import type { ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validators/task";

export async function createTask(
  userWallet: `0x${string}`,
  input: CreateTaskInput | unknown,
): Promise<ServiceResult<Task>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parsed.error.issues.map((i) => i.message).join("; "),
      },
    };
  }
  const db = getDb();
  return db.insertTask({
    userWallet,
    agentId: parsed.data.agentId,
    taskType: parsed.data.taskType,
    targetType: parsed.data.targetType,
    targetAddress: (parsed.data.targetAddress || null) as `0x${string}` | null,
    targetSymbol: parsed.data.targetSymbol ?? null,
    network: parsed.data.network,
    status: "pending",
    alertChannels: parsed.data.alertChannels,
    riskThreshold: parsed.data.riskThreshold ?? null,
    frequency: parsed.data.frequency,
    instructions: parsed.data.instructions ?? null,
    onchainTaskId: null,
  });
}

export async function getUserTasks(
  userWallet: `0x${string}`,
): Promise<ServiceResult<Task[]>> {
  return getDb().listUserTasks(userWallet);
}

export async function updateTaskStatus(
  _taskId: string,
  _status: Task["status"],
): Promise<ServiceResult<Task>> {
  return {
    ok: false,
    error: {
      kind: "not-configured",
      message: "Task mutations require a database adapter.",
      hint: "Implement updateTaskStatus in lib/database/client.ts.",
    },
  };
}
