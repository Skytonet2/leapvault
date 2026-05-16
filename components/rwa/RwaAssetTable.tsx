import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { riskLevelFromScore, RiskBadge } from "@/components/agents/RiskBadge";
import { formatApy, formatRelativeTime, formatUsd, shortAddress } from "@/lib/utils/format";
import { RWA_CATEGORY_LABEL, type RwaAsset } from "@/types/rwa";
import { explorerLink } from "@/lib/chains/mantle";

export function RwaAssetTable({ assets }: { assets: RwaAsset[] }) {
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted bg-bg-elevated/40">
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">APY</th>
              <th className="px-4 py-3 font-medium text-right">Liquidity</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Agents</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-bg-elevated/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-text-primary">{a.name}</div>
                  <div className="text-xs text-text-muted tnum">
                    {a.symbol} · {shortAddress(a.contractAddress)}
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {RWA_CATEGORY_LABEL[a.category]}
                </td>
                <td className="px-4 py-3 text-right tnum text-text-primary">
                  {formatApy(a.currentApy)}
                </td>
                <td className="px-4 py-3 text-right tnum text-text-primary">
                  {formatUsd(a.liquidity, { compact: true })}
                </td>
                <td className="px-4 py-3">
                  <RiskBadge level={riskLevelFromScore(a.riskScore)} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant="muted">{a.dataSource}</Badge>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {formatRelativeTime(a.lastUpdated)}
                </td>
                <td className="px-4 py-3 text-right text-text-primary tnum">
                  {a.activeMonitoringAgentIds.length}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={explorerLink(a.network, "address", a.contractAddress)}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-accent-sand text-xs hover:underline"
                  >
                    Explorer <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
