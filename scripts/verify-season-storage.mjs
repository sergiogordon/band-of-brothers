import assert from "node:assert/strict";
import test from "node:test";

const MEMBERS = ["jack", "sergio", "shadi", "sam", "aaron", "nigel"];
const PLACEMENT_POINTS = {
  1: 60,
  2: 40,
  3: 30,
  4: 20,
  5: 10,
  6: 0,
};
const POINT_TO_PLACEMENT = new Map(
  Object.entries(PLACEMENT_POINTS).map(([placement, points]) => [
    points,
    Number(placement),
  ]),
);

const SEED_EVENTS = [
  {
    id: "putt-shack-feb-2026",
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
  return events.map((event) => {
    const placements = MEMBERS.map((memberId) => {
      const nextPoints =
        event.standings.find((standing) => standing.memberId === memberId)?.points ?? 0;
      const delta = nextPoints - currentPoints[memberId];
      const placement = POINT_TO_PLACEMENT.get(delta);
      assert.ok(placement, `missing placement for ${memberId} in ${event.id}`);
      currentPoints[memberId] = nextPoints;
      return { memberId, placement };
    });

    return { eventId: event.id, placements };
  });
}

function applyPlacements(basePoints, placements) {
  const next = { ...basePoints };
  for (const placement of placements) {
    next[placement.memberId] += PLACEMENT_POINTS[placement.placement];
  }
  return next;
}

function assertValidPlacements(placements) {
  assert.equal(placements.length, MEMBERS.length);
  assert.equal(new Set(placements.map((placement) => placement.memberId)).size, MEMBERS.length);
  assert.equal(new Set(placements.map((placement) => placement.placement)).size, MEMBERS.length);
}

test("seed standings can be represented as relational placements", () => {
  const inferred = inferPlacements(SEED_EVENTS);
  let points = Object.fromEntries(MEMBERS.map((memberId) => [memberId, 0]));

  for (const event of inferred) {
    assertValidPlacements(event.placements);
    points = applyPlacements(points, event.placements);
  }

  assert.deepEqual(points, {
    jack: 230,
    sergio: 200,
    shadi: 150,
    sam: 90,
    aaron: 80,
    nigel: 50,
  });
});

test("a July event adds points from placements instead of client totals", () => {
  const julyPlacements = [
    { memberId: "sam", placement: 1 },
    { memberId: "aaron", placement: 2 },
    { memberId: "nigel", placement: 3 },
    { memberId: "shadi", placement: 4 },
    { memberId: "sergio", placement: 5 },
    { memberId: "jack", placement: 6 },
  ];

  assertValidPlacements(julyPlacements);
  assert.deepEqual(
    applyPlacements(
      {
        jack: 230,
        sergio: 200,
        shadi: 150,
        sam: 90,
        aaron: 80,
        nigel: 50,
      },
      julyPlacements,
    ),
    {
      jack: 230,
      sergio: 210,
      shadi: 170,
      sam: 150,
      aaron: 120,
      nigel: 80,
    },
  );
});

test("the July correction changes only Nigel's current total", () => {
  const juneStandings = {
    jack: 230,
    sergio: 200,
    shadi: 150,
    sam: 90,
    aaron: 80,
    nigel: 50,
  };
  const julyPlacements = [
    { memberId: "shadi", placement: 1 },
    { memberId: "aaron", placement: 2 },
    { memberId: "jack", placement: 3 },
    { memberId: "sergio", placement: 4 },
    { memberId: "nigel", placement: 5 },
    { memberId: "sam", placement: 6 },
  ];

  const julyStandings = applyPlacements(juneStandings, julyPlacements);
  const correctedJulyStandings = {
    ...julyStandings,
    nigel: julyStandings.nigel + 20,
  };

  assert.deepEqual(juneStandings, {
    jack: 230,
    sergio: 200,
    shadi: 150,
    sam: 90,
    aaron: 80,
    nigel: 50,
  });
  assert.deepEqual(correctedJulyStandings, {
    jack: 260,
    sergio: 220,
    shadi: 210,
    sam: 90,
    aaron: 120,
    nigel: 80,
  });
});

test("duplicate placements are invalid", () => {
  assert.throws(() =>
    assertValidPlacements([
      { memberId: "jack", placement: 1 },
      { memberId: "sergio", placement: 1 },
      { memberId: "shadi", placement: 3 },
      { memberId: "sam", placement: 4 },
      { memberId: "aaron", placement: 5 },
      { memberId: "nigel", placement: 6 },
    ]),
  );
});
