import { sql } from "@vercel/postgres";
import { events as seedEvents } from "@/data/events";
import { seasonAdjustments } from "@/data/adjustments";
import { members } from "@/data/members";
import { applyPlacements, getSortedEvents } from "@/lib/points";
import {
  createStoredEventResult,
  emptyPlacementMap,
  getFutureSlot,
  normalizeStoredEventResult,
  placementsRecordToFilled,
  sortStoredResults,
} from "@/lib/season-results";
import { emptySeasonState } from "@/lib/season-state";
import type {
  EventPlacement,
  EventSnapshot,
  Placement,
  SeasonState,
  StoredEventResult,
} from "@/lib/types";

export const SEASON_ID = "2026";

type DbEventRow = {
  id: string;
  season_id: string;
  slot_id: string | null;
  name: string;
  event_type: string;
  venue: string | null;
  date: Date | string;
  status: "draft" | "published";
};

type DbPlacementRow = {
  event_id: string;
  member_id: string;
  placement: number;
};

type DbAdjustmentRow = {
  id: string;
  season_id: string;
  member_id: string;
  points: number;
  reason: string;
  effective_date: Date | string;
};

type EventInput = {
  id: string;
  slotId: string | null;
  name: string;
  eventType: string;
  venue?: string;
  date: string;
  status: "draft" | "published";
};

const memberIds = new Set(members.map((member) => member.id));
const pointToPlacement = new Map<number, Placement>([
  [60, 1],
  [40, 2],
  [30, 3],
  [20, 4],
  [10, 5],
  [0, 6],
]);

let schemaReady = false;

export function hasDatabase(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export function assertDatabaseConfigured() {
  if (!hasDatabase()) {
    throw new Error("Database is not configured. Add POSTGRES_URL before saving results.");
  }
}

function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function standingsFromPlacements(
  basePoints: Record<string, number>,
  placements: EventPlacement[],
): Record<string, number> {
  return applyPlacements(basePoints, placements);
}

function applyAdjustments(
  points: Record<string, number>,
  eventDate: string,
  adjustments: DbAdjustmentRow[],
): Record<string, number> {
  const next = { ...points };

  for (const adjustment of adjustments) {
    if (formatDate(adjustment.effective_date) > eventDate) continue;
    if (!memberIds.has(adjustment.member_id)) continue;
    next[adjustment.member_id] = (next[adjustment.member_id] ?? 0) + adjustment.points;
  }

  return next;
}

function rowsToPlacements(rows: DbPlacementRow[]): Record<string, Placement | ""> {
  const placements = emptyPlacementMap();

  for (const row of rows) {
    if (!memberIds.has(row.member_id)) continue;
    if (row.placement < 1 || row.placement > 6) continue;
    placements[row.member_id] = row.placement as Placement;
  }

  return placements;
}

function placementRowsForEvent(
  eventId: string,
  placementRows: DbPlacementRow[],
): DbPlacementRow[] {
  return placementRows.filter((row) => row.event_id === eventId);
}

function buildPublishedSnapshots(
  eventRows: DbEventRow[],
  placementRows: DbPlacementRow[],
  adjustmentRows: DbAdjustmentRow[],
): EventSnapshot[] {
  let eventPoints = Object.fromEntries(members.map((member) => [member.id, 0]));
  const snapshots: EventSnapshot[] = [];

  for (const event of eventRows) {
    const placements = placementRowsForEvent(event.id, placementRows)
      .map((row) => ({
        memberId: row.member_id,
        placement: row.placement as Placement,
      }))
      .filter((placement) => memberIds.has(placement.memberId));

    eventPoints = standingsFromPlacements(eventPoints, placements);
    const points = applyAdjustments(
      eventPoints,
      formatDate(event.date),
      adjustmentRows,
    );
    snapshots.push({
      id: event.id,
      name: event.name,
      eventType: event.event_type,
      venue: event.venue ?? undefined,
      date: formatDate(event.date),
      placements,
      standings: members.map((member) => ({
        memberId: member.id,
        points: points[member.id] ?? 0,
      })),
    });
  }

  return snapshots;
}

function buildDrafts(
  eventRows: DbEventRow[],
  placementRows: DbPlacementRow[],
): StoredEventResult[] {
  const drafts = eventRows
    .map((event) => {
      if (!event.slot_id || !getFutureSlot(event.slot_id)) return null;

      return normalizeStoredEventResult({
        id: event.id,
        slotId: event.slot_id,
        name: event.name,
        eventType: event.event_type,
        date: formatDate(event.date),
        placements: rowsToPlacements(placementRowsForEvent(event.id, placementRows)),
      });
    })
    .filter((draft): draft is StoredEventResult => draft !== null);

  return sortStoredResults(drafts);
}

function inferSeedPlacements(events: EventSnapshot[]): Map<string, EventPlacement[]> {
  const sortedEvents = getSortedEvents(events);
  const currentPoints = Object.fromEntries(members.map((member) => [member.id, 0]));
  const placementsByEvent = new Map<string, EventPlacement[]>();

  for (const event of sortedEvents) {
    const placements: EventPlacement[] = [];

    for (const member of members) {
      const nextPoints =
        event.standings.find((standing) => standing.memberId === member.id)?.points ?? 0;
      const delta = nextPoints - (currentPoints[member.id] ?? 0);
      const placement = pointToPlacement.get(delta);

      if (!placement) {
        throw new Error(`Could not infer placement for ${member.id} in ${event.id}.`);
      }

      placements.push({ memberId: member.id, placement });
      currentPoints[member.id] = nextPoints;
    }

    placementsByEvent.set(event.id, placements);
  }

  return placementsByEvent;
}

export function seedPlacementsForEvent(eventId: string): EventPlacement[] {
  return inferSeedPlacements(seedEvents).get(eventId) ?? [];
}

async function ensureSchema() {
  if (schemaReady) return;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS season_events (
      id         TEXT PRIMARY KEY,
      season_id  TEXT NOT NULL,
      slot_id    TEXT,
      name       TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT '',
      venue      TEXT,
      date       DATE NOT NULL,
      status     TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS season_adjustments (
      id             TEXT PRIMARY KEY,
      season_id      TEXT NOT NULL,
      member_id      TEXT NOT NULL,
      points         INTEGER NOT NULL,
      reason         TEXT NOT NULL,
      effective_date DATE NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS season_events_season_slot_unique
      ON season_events (season_id, slot_id)
      WHERE slot_id IS NOT NULL;
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS event_placements (
      event_id   TEXT NOT NULL REFERENCES season_events(id) ON DELETE CASCADE,
      member_id  TEXT NOT NULL,
      placement  INTEGER NOT NULL CHECK (placement BETWEEN 1 AND 6),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (event_id, member_id),
      UNIQUE (event_id, placement)
    );
  `);

  schemaReady = true;
}

async function seedPublishedEventsIfEmpty() {
  const existing = await sql<{ count: string | number }>`
    SELECT COUNT(*) AS count
    FROM season_events
    WHERE season_id = ${SEASON_ID}
  `;

  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  const placementsByEvent = inferSeedPlacements(seedEvents);

  for (const event of getSortedEvents(seedEvents)) {
    await upsertEvent({
      id: event.id,
      slotId: null,
      name: event.name,
      eventType: event.eventType,
      venue: event.venue,
      date: event.date,
      status: "published",
    });

    for (const placement of placementsByEvent.get(event.id) ?? []) {
      await sql`
        INSERT INTO event_placements (event_id, member_id, placement, updated_at)
        VALUES (${event.id}, ${placement.memberId}, ${placement.placement}, now())
        ON CONFLICT (event_id, member_id) DO UPDATE
        SET placement = EXCLUDED.placement, updated_at = now()
      `;
    }
  }
}

async function ensureSeasonStorage() {
  assertDatabaseConfigured();
  await ensureSchema();
  await seedPublishedEventsIfEmpty();
  await seedSeasonAdjustments();
}

async function seedSeasonAdjustments() {
  for (const adjustment of seasonAdjustments) {
    await sql`
      INSERT INTO season_adjustments (
        id, season_id, member_id, points, reason, effective_date, updated_at
      )
      VALUES (
        ${adjustment.id},
        ${SEASON_ID},
        ${adjustment.memberId},
        ${adjustment.points},
        ${adjustment.reason},
        ${adjustment.effectiveDate},
        now()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        member_id = EXCLUDED.member_id,
        points = EXCLUDED.points,
        reason = EXCLUDED.reason,
        effective_date = EXCLUDED.effective_date,
        updated_at = now()
    `;
  }
}

async function listEventRows(): Promise<DbEventRow[]> {
  const result = await sql<DbEventRow>`
    SELECT id, season_id, slot_id, name, event_type, venue, date, status
    FROM season_events
    WHERE season_id = ${SEASON_ID}
    ORDER BY date ASC, id ASC
  `;

  return result.rows;
}

async function listPlacementRows(): Promise<DbPlacementRow[]> {
  const result = await sql<DbPlacementRow>`
    SELECT event_id, member_id, placement
    FROM event_placements
    WHERE event_id IN (
      SELECT id FROM season_events WHERE season_id = ${SEASON_ID}
    )
  `;

  return result.rows;
}

async function listAdjustmentRows(): Promise<DbAdjustmentRow[]> {
  const result = await sql<DbAdjustmentRow>`
    SELECT id, season_id, member_id, points, reason, effective_date
    FROM season_adjustments
    WHERE season_id = ${SEASON_ID}
    ORDER BY effective_date ASC, id ASC
  `;

  return result.rows;
}

function applyFallbackAdjustments(events: EventSnapshot[]): EventSnapshot[] {
  return events.map((event) => {
    const standings = event.standings.map((standing) => {
      const bonus = seasonAdjustments
        .filter(
          (adjustment) =>
            adjustment.memberId === standing.memberId &&
            adjustment.effectiveDate <= event.date,
        )
        .reduce((total, adjustment) => total + adjustment.points, 0);

      return { ...standing, points: standing.points + bonus };
    });

    return { ...event, standings };
  });
}

function withSeedPlacements(events: EventSnapshot[]): EventSnapshot[] {
  const placementsByEvent = inferSeedPlacements(seedEvents);

  return events.map((event) => ({
    ...event,
    placements: event.placements ?? placementsByEvent.get(event.id),
  }));
}

export async function getSeasonState(): Promise<SeasonState> {
  if (!hasDatabase()) {
    return emptySeasonState(applyFallbackAdjustments(withSeedPlacements(seedEvents)));
  }

  try {
    await ensureSeasonStorage();
    const [eventRows, placementRows, adjustmentRows] = await Promise.all([
      listEventRows(),
      listPlacementRows(),
      listAdjustmentRows(),
    ]);

    if (eventRows.length === 0) {
      return emptySeasonState(withSeedPlacements(seedEvents));
    }

    return {
      events: buildPublishedSnapshots(
        eventRows.filter((event) => event.status === "published"),
        placementRows,
        adjustmentRows,
      ),
      drafts: buildDrafts(
        eventRows.filter((event) => event.status === "draft"),
        placementRows,
      ),
    };
  } catch {
    return emptySeasonState(applyFallbackAdjustments(withSeedPlacements(seedEvents)));
  }
}

async function assertDraftEvent(eventId: string): Promise<DbEventRow> {
  const result = await sql<DbEventRow>`
    SELECT id, season_id, slot_id, name, event_type, venue, date, status
    FROM season_events
    WHERE season_id = ${SEASON_ID} AND id = ${eventId}
  `;
  const event = result.rows[0];

  if (!event) {
    throw new Error("Event draft was not found. Refresh and try again.");
  }

  if (event.status !== "draft") {
    throw new Error("Published events cannot be edited from this screen.");
  }

  return event;
}

async function assertPublishedEvent(eventId: string): Promise<DbEventRow> {
  const result = await sql<DbEventRow>`
    SELECT id, season_id, slot_id, name, event_type, venue, date, status
    FROM season_events
    WHERE season_id = ${SEASON_ID} AND id = ${eventId}
  `;
  const event = result.rows[0];

  if (!event) {
    throw new Error("Event was not found. Refresh and try again.");
  }

  if (event.status !== "published") {
    throw new Error("Only published events can be edited here.");
  }

  return event;
}

export async function createDraftEvent(slotId: string): Promise<SeasonState> {
  await ensureSeasonStorage();

  const normalized = createStoredEventResult(slotId);
  const existing = await sql<{ id: string }>`
    SELECT id
    FROM season_events
    WHERE season_id = ${SEASON_ID}
      AND (id = ${normalized.id} OR slot_id = ${normalized.slotId})
    LIMIT 1
  `;

  if (existing.rows.length > 0) {
    throw new Error("That event month already exists.");
  }

  await upsertEvent({
    id: normalized.id,
    slotId: normalized.slotId,
    name: normalized.name,
    eventType: normalized.eventType,
    date: normalized.date,
    status: "draft",
  });

  return getSeasonState();
}

export async function updateDraftEventDetails(
  result: StoredEventResult,
): Promise<SeasonState> {
  await ensureSeasonStorage();

  const normalized = normalizeStoredEventResult(result);
  if (!normalized) {
    throw new Error("Event draft is invalid.");
  }

  await assertDraftEvent(normalized.id);

  await upsertEvent({
    id: normalized.id,
    slotId: normalized.slotId,
    name: normalized.name,
    eventType: normalized.eventType,
    date: normalized.date,
    status: "draft",
  });

  return getSeasonState();
}

export async function updateDraftPlacement(
  eventId: string,
  memberId: string,
  placement: Placement | "",
): Promise<SeasonState> {
  await ensureSeasonStorage();
  await assertDraftEvent(eventId);

  if (!memberIds.has(memberId)) {
    throw new Error("Unknown member.");
  }

  try {
    if (placement === "") {
      await sql`
        DELETE FROM event_placements
        WHERE event_id = ${eventId} AND member_id = ${memberId}
      `;
    } else {
      await sql`
        INSERT INTO event_placements (event_id, member_id, placement, updated_at)
        VALUES (${eventId}, ${memberId}, ${placement}, now())
        ON CONFLICT (event_id, member_id) DO UPDATE
        SET placement = EXCLUDED.placement, updated_at = now()
      `;
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new Error("That placement is already assigned for this event.");
    }

    throw error;
  }

  return getSeasonState();
}

export async function clearDraftPlacements(eventId: string): Promise<SeasonState> {
  await ensureSeasonStorage();
  await assertDraftEvent(eventId);

  await sql`
    DELETE FROM event_placements
    WHERE event_id = ${eventId}
  `;

  return getSeasonState();
}

export async function updatePublishedPlacements(
  eventId: string,
  placements: EventPlacement[],
): Promise<SeasonState> {
  await ensureSeasonStorage();
  await assertPublishedEvent(eventId);

  const usedMembers = new Set<string>();
  const usedPlacements = new Set<Placement>();

  for (const placement of placements) {
    if (!memberIds.has(placement.memberId)) {
      throw new Error("Unknown member.");
    }

    usedMembers.add(placement.memberId);
    usedPlacements.add(placement.placement);
  }

  if (
    placements.length !== members.length ||
    usedMembers.size !== members.length ||
    usedPlacements.size !== members.length
  ) {
    throw new Error("Event must have one unique placement for every member.");
  }

  await sql`DELETE FROM event_placements WHERE event_id = ${eventId}`;

  for (const placement of placements) {
    await sql`
      INSERT INTO event_placements (event_id, member_id, placement, updated_at)
      VALUES (${eventId}, ${placement.memberId}, ${placement.placement}, now())
    `;
  }

  return getSeasonState();
}

export async function deleteDraftEvent(eventId: string): Promise<SeasonState> {
  await ensureSeasonStorage();
  await assertDraftEvent(eventId);

  await sql`
    DELETE FROM season_events
    WHERE season_id = ${SEASON_ID} AND id = ${eventId} AND status = 'draft'
  `;

  return getSeasonState();
}

export async function deleteAllDraftEvents(): Promise<SeasonState> {
  await ensureSeasonStorage();

  await sql`
    DELETE FROM season_events
    WHERE season_id = ${SEASON_ID} AND status = 'draft'
  `;

  return getSeasonState();
}

export async function publishDraftEvent(eventId: string): Promise<SeasonState> {
  await ensureSeasonStorage();
  const current = await getSeasonState();
  const draft = current.drafts.find((item) => item.id === eventId);

  if (!draft) {
    throw new Error("Event draft was not found. Refresh and try again.");
  }

  const firstDraft = current.drafts[0];
  if (firstDraft?.id !== draft.id) {
    throw new Error("Publish earlier events before adding this event.");
  }

  const placements = placementsRecordToFilled(draft.placements);
  const usedPlacements = new Set(placements.map((item) => item.placement));
  const usedMembers = new Set(placements.map((item) => item.memberId));

  if (
    placements.length !== members.length ||
    usedPlacements.size !== members.length ||
    usedMembers.size !== members.length
  ) {
    throw new Error("Event must have valid, complete placements before publishing.");
  }

  await sql`
    UPDATE season_events
    SET status = 'published', updated_at = now()
    WHERE season_id = ${SEASON_ID} AND id = ${draft.id} AND status = 'draft'
  `;

  return getSeasonState();
}

async function upsertEvent(input: EventInput) {
  await sql`
    INSERT INTO season_events (
      id, season_id, slot_id, name, event_type, venue, date, status, updated_at
    )
    VALUES (
      ${input.id},
      ${SEASON_ID},
      ${input.slotId},
      ${input.name},
      ${input.eventType},
      ${input.venue ?? null},
      ${input.date},
      ${input.status},
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      slot_id = EXCLUDED.slot_id,
      name = EXCLUDED.name,
      event_type = EXCLUDED.event_type,
      venue = EXCLUDED.venue,
      date = EXCLUDED.date,
      status = EXCLUDED.status,
      updated_at = now()
  `;
}
