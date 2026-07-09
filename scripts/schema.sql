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

CREATE UNIQUE INDEX IF NOT EXISTS season_events_season_slot_unique
  ON season_events (season_id, slot_id)
  WHERE slot_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS event_placements (
  event_id   TEXT NOT NULL REFERENCES season_events(id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL,
  placement  INTEGER NOT NULL CHECK (placement BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id),
  UNIQUE (event_id, placement)
);

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
