import "server-only";

import { z } from "zod";
import { generate } from "./provider";
import type { AIResponse } from "./types";
import { addRiskDisclaimer } from "./safety";

/**
 * One safety system prompt for every AI feature. The string here is the
 * single source-of-truth for product voice and guardrails.
 */
const SYSTEM_PROMPT = `You are an analytical assistant inside LeapVault Agent, a financial-intelligence terminal for on-chain alpha and real-world-asset (RWA) monitoring on Mantle.

Voice rules:
- Calm, neutral, analytical. Never hype.
- Use hedged language: "may indicate", "potential risk", "based on available data".
- Never give direct financial advice. Never use: "buy now", "sell now", "guaranteed", "risk-free", "moon", "pump", "ape in".
- If data is missing or unverifiable, explicitly say so. Never invent numbers.
- Always include data sources and confidence when relevant.
- Output exactly the JSON schema requested, with no preamble, no markdown fences, no commentary outside JSON.
`;

const riskLevel = z.enum(["low", "medium", "high", "unknown"]);

// ---------- Wallet movement ----------
const walletSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  whyItMatters: z.string(),
  riskLevel,
  confidence: z.number().min(0).max(1),
  dataLimitations: z.string(),
  notFinancialAdvice: z.literal(true),
});
export type WalletMovementSummary = z.infer<typeof walletSummarySchema>;

export interface WalletMovementInput {
  wallet: `0x${string}`;
  transactionType: string;
  asset?: string | null;
  value?: string | null;
  timestamp?: string | null;
  related?: string[];
  historicalContext?: string | null;
}

export async function generateWalletMovementSummary(
  input: WalletMovementInput,
  ctx: { userWallet?: string | null } = {},
): Promise<{ data: WalletMovementSummary; meta: AIResponse }> {
  const user = `Summarize this wallet movement. Return JSON matching this schema (no markdown):

{
  "title": string,
  "summary": string,
  "whyItMatters": string,
  "riskLevel": "low" | "medium" | "high" | "unknown",
  "confidence": number between 0 and 1,
  "dataLimitations": string,
  "notFinancialAdvice": true
}

Movement:
${JSON.stringify(input, null, 2)}`;
  return runJson(
    { user, feature: "wallet-movement-summary", userWallet: ctx.userWallet },
    walletSummarySchema,
  );
}

// ---------- RWA asset report ----------
const rwaReportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  yieldExplanation: z.string(),
  riskBreakdown: z.array(
    z.object({ factor: z.string(), level: riskLevel, note: z.string() }),
  ),
  monitoringRecommendation: z.string(),
  confidence: z.number().min(0).max(1),
  dataLimitations: z.string(),
  notFinancialAdvice: z.literal(true),
});
export type RwaAssetReport = z.infer<typeof rwaReportSchema>;

export interface RwaReportInput {
  name: string;
  symbol: string;
  contractAddress: `0x${string}`;
  issuer?: string | null;
  currentApy?: number | null;
  liquidity?: number | null;
  riskFactors?: Record<string, number | null>;
  dataSource: string;
}

export async function generateRwaAssetReport(
  input: RwaReportInput,
  ctx: { userWallet?: string | null } = {},
): Promise<{ data: RwaAssetReport; meta: AIResponse }> {
  const user = `Produce a structured RWA asset report. Return JSON matching this schema (no markdown):

{
  "title": string,
  "summary": string,
  "yieldExplanation": string,
  "riskBreakdown": [{ "factor": string, "level": "low"|"medium"|"high"|"unknown", "note": string }],
  "monitoringRecommendation": string,
  "confidence": number between 0 and 1,
  "dataLimitations": string,
  "notFinancialAdvice": true
}

Asset:
${JSON.stringify(input, null, 2)}`;
  return runJson(
    { user, feature: "rwa-asset-report", userWallet: ctx.userWallet },
    rwaReportSchema,
  );
}

// ---------- Alert explanation ----------
const alertExplanationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  whyItMatters: z.string(),
  whatToVerify: z.string(),
  riskLevel,
  confidence: z.number().min(0).max(1),
  dataLimitations: z.string(),
  notFinancialAdvice: z.literal(true),
});
export type AlertExplanation = z.infer<typeof alertExplanationSchema>;

export interface AlertExplanationInput {
  alertType: string;
  sourceData: Record<string, unknown>;
  severity: string;
  subject: { kind: string; ref: string };
  dataSource: string;
}

export async function generateAlertExplanation(
  input: AlertExplanationInput,
  ctx: { userWallet?: string | null } = {},
): Promise<{ data: AlertExplanation; meta: AIResponse }> {
  const user = `Turn this deterministic alert into a clear user-facing explanation. Return JSON matching this schema (no markdown):

{
  "title": string,
  "summary": string,
  "whyItMatters": string,
  "whatToVerify": string,
  "riskLevel": "low"|"medium"|"high"|"unknown",
  "confidence": number between 0 and 1,
  "dataLimitations": string,
  "notFinancialAdvice": true
}

Alert:
${JSON.stringify(input, null, 2)}`;
  return runJson(
    { user, feature: "alert-explanation", userWallet: ctx.userWallet },
    alertExplanationSchema,
  );
}

// ---------- Task report ----------
const taskReportSchema = z.object({
  executiveSummary: z.string(),
  keyFindings: z.array(z.string()),
  risksFound: z.array(
    z.object({ title: z.string(), level: riskLevel, note: z.string() }),
  ),
  dataLimitations: z.string(),
  nextRecommendedStep: z.string(),
  confidence: z.number().min(0).max(1),
  notFinancialAdvice: z.literal(true),
});
export type TaskReport = z.infer<typeof taskReportSchema>;

export interface TaskReportInput {
  taskName: string;
  agentName: string;
  activity: string[];
  alerts: Array<{ severity: string; title: string }>;
  changesDetected: string[];
  finalStatus: string;
}

export async function generateTaskReport(
  input: TaskReportInput,
  ctx: { userWallet?: string | null } = {},
): Promise<{ data: TaskReport; meta: AIResponse }> {
  const user = `Write a user-readable monitoring task report. Return JSON matching this schema (no markdown):

{
  "executiveSummary": string,
  "keyFindings": string[],
  "risksFound": [{ "title": string, "level": "low"|"medium"|"high"|"unknown", "note": string }],
  "dataLimitations": string,
  "nextRecommendedStep": string,
  "confidence": number between 0 and 1,
  "notFinancialAdvice": true
}

Task data:
${JSON.stringify(input, null, 2)}`;
  return runJson(
    { user, feature: "task-report", userWallet: ctx.userWallet },
    taskReportSchema,
  );
}

// ---------- Risk summary (used inline on RWA / Agents) ----------
const riskSummarySchema = z.object({
  summary: z.string(),
  riskLevel,
  confidence: z.number().min(0).max(1),
  dataLimitations: z.string(),
  notFinancialAdvice: z.literal(true),
});
export type RiskSummary = z.infer<typeof riskSummarySchema>;

export async function generateRiskSummary(
  payload: Record<string, unknown>,
  ctx: { userWallet?: string | null; feature?: string } = {},
): Promise<{ data: RiskSummary; meta: AIResponse }> {
  const user = `Summarize this risk signal in 1-3 sentences. Return JSON matching:

{
  "summary": string,
  "riskLevel": "low"|"medium"|"high"|"unknown",
  "confidence": number between 0 and 1,
  "dataLimitations": string,
  "notFinancialAdvice": true
}

Payload:
${JSON.stringify(payload, null, 2)}`;
  return runJson(
    { user, feature: ctx.feature ?? "risk-summary", userWallet: ctx.userWallet },
    riskSummarySchema,
  );
}

// ---------- Agent explanation ----------
const agentExplanationSchema = z.object({
  summary: z.string(),
  bestUseCases: z.array(z.string()),
  limitations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  notFinancialAdvice: z.literal(true),
});
export type AgentExplanation = z.infer<typeof agentExplanationSchema>;

export async function generateAgentExplanation(
  input: { name: string; category: string; skills: string[]; reputation: number | null },
  ctx: { userWallet?: string | null } = {},
): Promise<{ data: AgentExplanation; meta: AIResponse }> {
  const user = `Describe what this AI monitoring agent is good at. Return JSON matching:

{
  "summary": string,
  "bestUseCases": string[],
  "limitations": string[],
  "confidence": number between 0 and 1,
  "notFinancialAdvice": true
}

Agent:
${JSON.stringify(input, null, 2)}`;
  return runJson(
    { user, feature: "agent-explanation", userWallet: ctx.userWallet },
    agentExplanationSchema,
  );
}

// ---------------- Internals ----------------

interface RunOptions {
  user: string;
  feature: string;
  userWallet?: string | null;
}

async function runJson<T>(
  opts: RunOptions,
  schema: z.ZodSchema<T>,
): Promise<{ data: T; meta: AIResponse }> {
  const attempt = async (extraSystem?: string) =>
    generate(
      [
        { role: "system", content: SYSTEM_PROMPT + (extraSystem ? `\n\n${extraSystem}` : "") },
        { role: "user", content: opts.user },
      ],
      {
        feature: opts.feature,
        userWallet: opts.userWallet,
        jsonMode: true,
        maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1200),
      },
    );

  let response = await attempt();
  let parsed = tryParse<T>(response.content, schema);
  if (!parsed.ok) {
    response = await attempt(
      "Your previous output was not valid JSON. Return ONLY a valid JSON object matching the schema. No code fences. No prose.",
    );
    parsed = tryParse<T>(response.content, schema);
  }
  if (!parsed.ok) {
    // Final safe fallback: hand back a minimal disclaimer message so the app
    // never crashes on malformed model output.
    const fallback = schema.safeParse({
      title: "Analysis unavailable",
      summary: addRiskDisclaimer(
        "The AI provider returned an unexpected response. The underlying data is unchanged.",
      ),
      whyItMatters: "Try again shortly or switch AI provider in Settings.",
      whatToVerify: "Verify the raw signal directly from the data source.",
      riskLevel: "unknown",
      confidence: 0,
      dataLimitations: "Model output failed validation.",
      notFinancialAdvice: true,
      executiveSummary: "Analysis unavailable.",
      keyFindings: [],
      risksFound: [],
      nextRecommendedStep: "Retry analysis.",
      riskBreakdown: [],
      yieldExplanation: "Unavailable.",
      monitoringRecommendation: "Unavailable.",
      bestUseCases: [],
      limitations: ["Analysis temporarily unavailable."],
    });
    if (fallback.success) {
      return { data: fallback.data as T, meta: response };
    }
    throw new Error("AI output failed validation and could not be recovered.");
  }
  return { data: parsed.value, meta: response };
}

function tryParse<T>(
  raw: string,
  schema: z.ZodSchema<T>,
): { ok: true; value: T } | { ok: false } {
  if (!raw) return { ok: false };
  // Tolerate accidental code-fence wrapping.
  const stripped = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const json = JSON.parse(stripped);
    const result = schema.safeParse(json);
    if (result.success) return { ok: true, value: result.data };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
