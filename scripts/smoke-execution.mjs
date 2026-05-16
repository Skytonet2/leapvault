/**
 * Smoke test: confirm the execution-layer tables exist and per-agent
 * capability rows are populated. Read-only.
 *
 * Usage:
 *   node --env-file=.env.local scripts/smoke-execution.mjs
 */

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { ssl: "require", prepare: false });

try {
  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'execution_proposals',
        'execution_logs',
        'execution_provider_config',
        'provider_health_checks',
        'agent_execution_capabilities'
      )
    order by table_name
  `;
  console.log("execution tables present:", tables.map((t) => t.table_name).join(", "));

  const caps = await sql`
    select a.slug, c.provider, c.action_type
    from agent_execution_capabilities c
    join agents a on a.id = c.agent_id
    order by a.slug, c.provider, c.action_type
  `;
  console.log(`\nagent_execution_capabilities rows: ${caps.length}`);
  for (const row of caps) {
    console.log(`  ${row.slug.padEnd(22)} ${row.provider.padEnd(10)} ${row.action_type}`);
  }

  const rep = await sql`
    select column_name from information_schema.columns
    where table_name = 'agent_reputation'
      and column_name in ('proposals_created', 'proposals_approved', 'executions_completed', 'user_feedback_score')
    order by column_name
  `;
  console.log("\nreputation new columns:", rep.map((r) => r.column_name).join(", "));
} finally {
  await sql.end();
}
