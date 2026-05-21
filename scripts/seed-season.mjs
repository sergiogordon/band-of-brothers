import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sql } = require("@vercel/postgres");

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEED_EVENTS = [
  {
    id: "putt-shack-feb-2026",
    name: "Putt Shack",
    eventType: "golf",
    venue: "Addison, Texas",
    date: "2026-02-01",
    standings: [
      { memberId: "shadi", points: 60 },
      { memberId: "jack", points: 40 },
      { memberId: "sergio", points: 30 },
      { memberId: "aaron", points: 20 },
      { memberId: "nigel", points: 10 },
      { memberId: "sam", points: 0 },
    ],
  },
  {
    id: "poker-mar-10-2026",
    name: "Poker Night",
    eventType: "poker",
    date: "2026-03-10",
    standings: [
      { memberId: "sergio", points: 90 },
      { memberId: "jack", points: 80 },
      { memberId: "shadi", points: 70 },
      { memberId: "aaron", points: 40 },
      { memberId: "sam", points: 30 },
      { memberId: "nigel", points: 10 },
    ],
  },
  {
    id: "bowling-mar-25-2026",
    name: "Bowling",
    eventType: "bowling",
    venue: "Main Event",
    date: "2026-03-25",
    standings: [
      { memberId: "jack", points: 140 },
      { memberId: "sergio", points: 120 },
      { memberId: "shadi", points: 110 },
      { memberId: "aaron", points: 50 },
      { memberId: "nigel", points: 30 },
      { memberId: "sam", points: 30 },
    ],
  },
  {
    id: "poker-may-19-2026",
    name: "Poker Night",
    eventType: "poker",
    date: "2026-05-19",
    standings: [
      { memberId: "jack", points: 170 },
      { memberId: "sergio", points: 160 },
      { memberId: "shadi", points: 120 },
      { memberId: "sam", points: 90 },
      { memberId: "aaron", points: 70 },
      { memberId: "nigel", points: 30 },
    ],
  },
];

const SEASON_ID = "2026";

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL is required. Add it to .env.local or your shell.");
    process.exit(1);
  }

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await sql.query(schema);

  const existing = await sql`
    SELECT id FROM season_state WHERE id = ${SEASON_ID}
  `;

  if (existing.rows.length > 0) {
    console.log(`Season ${SEASON_ID} already seeded — skipping insert.`);
    return;
  }

  const data = { events: SEED_EVENTS, drafts: [] };

  await sql`
    INSERT INTO season_state (id, data, updated_at)
    VALUES (${SEASON_ID}, ${JSON.stringify(data)}::jsonb, now())
  `;

  console.log(`Seeded season ${SEASON_ID} with ${SEED_EVENTS.length} events.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
