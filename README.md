# Band of Brothers

Season leaderboard, timeline, and what-if simulator for the Band of Brothers men's group (2026 season).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `POSTGRES_URL`, read-only pages fall back to seeded data in [`src/data/events.ts`](src/data/events.ts). Result writes require Postgres.

## Cross-device sync (Vercel Marketplace Postgres)

Season events and entered results are stored in Postgres so every device sees the same data after deploy.

### One-time setup

1. In the [Vercel dashboard](https://vercel.com), open the project → **Storage** and add a Marketplace Postgres integration such as Neon.
2. Vercel links `POSTGRES_URL` to the project automatically.
3. Add `RESULTS_ADMIN_KEY` in Vercel and use the same key on `/events` when saving results.
4. For local dev, copy the connection string and admin key into `.env.local` (see [`.env.example`](.env.example)).
5. Seed the 2026 season (creates the relational tables and inserts the existing published events):

```bash
npm run seed:season
```

Safe to re-run — it upserts the seeded published events and placements.

### Update standings after an event

1. Open [`/events`](http://localhost:3000/events) on any device.
2. Enter the admin key, add the month, enter placements, and save — drafts sync to Postgres automatically.
3. Completed valid months update the homepage leaderboard, timeline, and race chart for everyone.

No redeploy needed for new results.

## Adjust scoring

Edit placement points in [`src/data/scoring.ts`](src/data/scoring.ts) (`PLACEMENT_POINTS`).

## Member photos

Place PNGs in [`public/members/`](public/members/) as `jack.png`, `sergio.png`, etc., and reference them in [`src/data/members.ts`](src/data/members.ts). Season climb bobbles live in [`public/members/bobble-faces-clean/`](public/members/bobble-faces-clean/) — drop face cutouts into [`public/members/faces/`](public/members/faces/) and run `node scripts/process-bobble-faces.mjs`.

## Deploy

Works on [Vercel](https://vercel.com) out of the box:

```bash
npm run build
```

After connecting Postgres in Vercel, run `npm run seed:season` once with `POSTGRES_URL` set (locally against the production DB, or via a one-off script).

## Project structure

- `src/data/` — members, schedule slots, scoring rules, dev fallback events
- `src/lib/db/` — Postgres read/write for relational event results
- `src/lib/` — points engine, timeline helpers, season merge logic
- `src/app/actions/` — Server Actions for season sync
- `src/components/` — Leaderboard, SeasonTimeline, Simulator UI, SeasonProvider
