import { z } from "zod";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export const evmAddress = z
  .string()
  .regex(EVM_ADDRESS, "Must be a valid EVM address (0x + 40 hex chars).")
  .transform((v) => v.toLowerCase() as `0x${string}`);

export const optionalEvmAddress = z
  .union([evmAddress, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? (v as `0x${string}`) : null));

export function isEvmAddress(input: unknown): input is `0x${string}` {
  return typeof input === "string" && EVM_ADDRESS.test(input);
}
