import { z } from "zod";
import { evmAddress } from "./evm";

export const taskTypeSchema = z.enum([
  "track-wallet",
  "monitor-whale",
  "monitor-rwa-yield",
  "monitor-liquidity",
  "monitor-token-risk",
  "monitor-portfolio-risk",
]);

export const taskTargetTypeSchema = z.enum(["wallet", "token", "asset", "portfolio"]);

export const alertChannelSchema = z.enum(["in-app", "telegram", "discord", "email"]);

export const taskFrequencySchema = z.enum(["realtime", "hourly", "daily", "weekly"]);

export const createTaskSchema = z
  .object({
    agentId: z.string().min(1, "Select an agent."),
    taskType: taskTypeSchema,
    targetType: taskTargetTypeSchema,
    targetAddress: z.union([evmAddress, z.literal("")]).optional(),
    targetSymbol: z.string().trim().max(32).optional(),
    network: z.coerce.number().int().positive(),
    alertChannels: z.array(alertChannelSchema).min(1, "Pick at least one alert channel."),
    riskThreshold: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || !Number.isNaN(Number(v)), "Threshold must be a number."),
    frequency: taskFrequencySchema,
    instructions: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, ctx) => {
    const needsAddress =
      value.targetType === "wallet" ||
      value.targetType === "token" ||
      value.targetType === "asset";
    if (needsAddress && !value.targetAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetAddress"],
        message: "Target address is required for this task type.",
      });
    }
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
