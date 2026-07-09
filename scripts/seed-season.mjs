import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sql } = require("@vercel/postgres");

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEASON_ID = "2026";
const MEMBERS = ["jack", "sergio", "shadi", "sam", "aaron", "nigel"];
const POINT_TO_PLACEMENT = new Map([
  [60, 1],
  [40, 2],
  [30, 3],
  [20, 4],
  [10, 5],
  [0, 6],
]);

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
  {
    id: "jun-2026-result",
    name: "June Event",
    eventType: "",
    date: "2026-06-01",
    standings: [
      { memberId: "jack", points: 230 },
      { memberId: "sergio", points: 200 },
      { memberId: "shadi", points: 150 },
      { memberId: "sam", points: 90 },
      { memberId: "aaron", points: 80 },
      { memberId: "nigel", points: 50 },
    ],
  },
];

function inferPlacements(events) {
  const currentPoints = Object.fromEntries(MEMBERS.map((memberId) => [memberId, 0]));
  const placementsByEvent = new Map();

  for (const event of events) {
    const placements = [];

    for (const memberId of MEMBERS) {
      const nextPoints =
        event.standings.find((standing) => standing.memberId === memberId)?.points ?? 0;
      const delta = nextPoints - currentPoints[memberId];
      const placement = POINT_TO_PLACEMENT.get(delta);

      if (!placement) {
        throw new Error(`Could not infer placement for ${memberId} in ${event.id}.`);
      }

      placements.push({ memberId, placement });
      currentPoints[memberId] = nextPoints;
    }

    placementsByEvent.set(event.id, placements);
  }

  return placementsByEvent;
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL is required. Add it to .env.local or your shell.");
    process.exit(1);
  }

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await sql.query(schema);

  const placementsByEvent = inferPlacements(SEED_EVENTS);

  for (const event of SEED_EVENTS) {
    await sql`
      INSERT INTO season_events (
        id, season_id, slot_id, name, event_type, venue, date, status, updated_at
      )
      VALUES (
        ${event.id},
        ${SEASON_ID},
        ${null},
        ${event.name},
        ${event.eventType},
        ${event.venue ?? null},
        ${event.date},
        'published',
        now()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        event_type = EXCLUDED.event_type,
        venue = EXCLUDED.venue,
        date = EXCLUDED.date,
        status = 'published',
        updated_at = now()
    `;

    for (const placement of placementsByEvent.get(event.id) ?? []) {
      await sql`
        INSERT INTO event_placements (event_id, member_id, placement, updated_at)
        VALUES (${event.id}, ${placement.memberId}, ${placement.placement}, now())
        ON CONFLICT (event_id, member_id) DO UPDATE
        SET placement = EXCLUDED.placement, updated_at = now()
      `;
    }
  }

  console.log(`Seeded season ${SEASON_ID} with ${SEED_EVENTS.length} published events.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
