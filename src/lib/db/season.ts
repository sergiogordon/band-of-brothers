import { sql } from "@vercel/postgres";
import { events as seedEvents } from "@/data/events";
import { emptySeasonState, normalizeSeasonState } from "@/lib/season-state";
import type { SeasonState } from "@/lib/types";

export const SEASON_ID = "2026";

function hasDatabase(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export async function getSeasonState(): Promise<SeasonState> {
  if (!hasDatabase()) {
    return emptySeasonState(seedEvents);
  }

  try {
    const result = await sql`
      SELECT data FROM season_state WHERE id = ${SEASON_ID}
    `;

    if (result.rows.length === 0) {
      return emptySeasonState(seedEvents);
    }

    return normalizeSeasonState(result.rows[0].data);
  } catch {
    return emptySeasonState(seedEvents);
  }
}

export async function saveSeasonState(state: SeasonState): Promise<SeasonState> {
  const normalized = normalizeSeasonState(state);

  if (!hasDatabase()) {
    return normalized;
  }

  await sql`
    INSERT INTO season_state (id, data, updated_at)
    VALUES (${SEASON_ID}, ${JSON.stringify(normalized)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data, updated_at = now()
  `;

  return normalized;
}
