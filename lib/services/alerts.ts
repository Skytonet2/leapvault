import "server-only";

import type { Alert } from "@/types/alert";
import type { ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";

export async function getUserAlerts(
  userWallet: `0x${string}`,
  filter?: { unreadOnly?: boolean; severity?: Alert["severity"] },
): Promise<ServiceResult<Alert[]>> {
  const res = await getDb().listUserAlerts(userWallet);
  if (!res.ok) return res;
  let list = res.data;
  if (filter?.unreadOnly) list = list.filter((a) => !a.readAt);
  if (filter?.severity) list = list.filter((a) => a.severity === filter.severity);
  return { ok: true, data: list };
}

export async function markAlertAsRead(
  alertId: string,
  userWallet: `0x${string}`,
): Promise<ServiceResult<Alert>> {
  return getDb().markAlertRead(alertId, userWallet);
}
