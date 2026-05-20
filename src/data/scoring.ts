import type { Placement } from "@/lib/types";

/** Points awarded per placement at each event. */
export const PLACEMENT_POINTS: Record<Placement, number> = {
  1: 60,
  2: 40,
  3: 20,
  4: 10,
  5: 5,
  6: 0,
};

export const PLACEMENTS: Placement[] = [1, 2, 3, 4, 5, 6];

export function pointsForPlacement(placement: Placement): number {
  return PLACEMENT_POINTS[placement];
}
