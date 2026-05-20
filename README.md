# Band of Brothers

Season leaderboard, historical timeline, and what-if simulator for the Band of Brothers men's group (2026 season).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Update standings after an event

1. Open [`src/data/events.ts`](src/data/events.ts).
2. Append a new event object with the **cumulative** standings after that event (sorted by points, highest first).
3. Use an ISO date string (`YYYY-MM-DD`) and a unique `id`.

Example:

```ts
{
  id: "poker-jun-2026",
  name: "Poker Night",
  date: "2026-06-15",
  standings: [
    { memberId: "jack", points: 230 },
    // ...
  ],
},
```

## Adjust scoring

Edit placement points in [`src/data/scoring.ts`](src/data/scoring.ts) (`PLACEMENT_POINTS`).

## Member photos

Place PNGs in [`public/members/`](public/members/) as `jack.png`, `sergio.png`, etc., and reference them in [`src/data/members.ts`](src/data/members.ts). Season climb bobbles live in [`public/members/bobble-faces-clean/`](public/members/bobble-faces-clean/) — drop face cutouts into [`public/members/faces/`](public/members/faces/) and run `node scripts/process-bobble-faces.mjs`.

## Deploy

Works on [Vercel](https://vercel.com) out of the box:

```bash
npm run build
```

## Project structure

- `src/data/` — members, events, scoring rules
- `src/lib/` — points engine and timeline helpers
- `src/components/` — Leaderboard, SeasonTimeline, Simulator UI
