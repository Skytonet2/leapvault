/**
 * Lightweight guardrails for AI outputs surfaced to users in a financial
 * intelligence context. These are post-processing checks — the source of
 * truth is the prompt itself (see lib/ai/prompts.ts), but never trust the
 * model alone.
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bbuy\s+now\b/i,
  /\bsell\s+now\b/i,
  /\bguaranteed\s+profit\b/i,
  /\brisk[-\s]?free\b/i,
  /\bthis\s+will\s+pump\b/i,
  /\byou\s+should\s+invest\b/i,
  /\bmoon(s|ing)?\b/i,
  /\bape\s+in\b/i,
];

const DISCLAIMER =
  "This is not financial advice. Verify all signals independently before acting.";

export function sanitizeFinancialLanguage(input: string): string {
  let cleaned = input;
  cleaned = cleaned.replace(/\bbuy now\b/gi, "the data may suggest entry interest");
  cleaned = cleaned.replace(/\bsell now\b/gi, "the data may suggest reduced confidence");
  cleaned = cleaned.replace(/\bguaranteed profit\b/gi, "potential outcome (unverified)");
  cleaned = cleaned.replace(/\brisk[-\s]?free\b/gi, "of unknown risk");
  cleaned = cleaned.replace(/\bthis will pump\b/gi, "movement is possible but unverified");
  cleaned = cleaned.replace(/\byou should invest\b/gi, "users may wish to evaluate");
  return cleaned;
}

export function containsForbiddenAdvice(input: string): boolean {
  return FORBIDDEN_PATTERNS.some((re) => re.test(input));
}

export function addRiskDisclaimer(input: string): string {
  if (input.toLowerCase().includes("not financial advice")) return input;
  return `${input.trim()}\n\n${DISCLAIMER}`;
}

export function enforceNoAdvicePolicy(input: string): {
  text: string;
  modified: boolean;
  flagged: boolean;
} {
  const flagged = containsForbiddenAdvice(input);
  let text = input;
  let modified = false;
  if (flagged) {
    text = sanitizeFinancialLanguage(text);
    modified = true;
  }
  return { text, modified, flagged };
}

export function validateAIOutput(input: string): { ok: boolean; reason?: string } {
  if (!input || !input.trim()) {
    return { ok: false, reason: "Empty model output." };
  }
  if (containsForbiddenAdvice(input)) {
    return { ok: false, reason: "Output contained disallowed advice language." };
  }
  return { ok: true };
}
