import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false });
const rows = await sql`select count(*) from rwa_assets`;
const samples = await sql`select symbol, network, data_source, last_updated from rwa_assets order by liquidity desc nulls last limit 5`;
console.log("rwa_assets total:", rows[0].count);
console.log("\ntop 5 by liquidity:");
for (const r of samples) {
  console.log(`  ${r.symbol.padEnd(16)} chain=${r.network} source=${r.data_source} updated=${r.last_updated}`);
}
await sql.end();
