export type SeasonAdjustment = {
  id: string;
  memberId: string;
  points: number;
  reason: string;
  effectiveDate: string;
};

export const seasonAdjustments: SeasonAdjustment[] = [
  {
    id: "nigel-bowling-correction-2026",
    memberId: "nigel",
    points: 20,
    reason: "Miscellaneous bonus for Bowling correction",
    effectiveDate: "2026-06-01",
  },
];
