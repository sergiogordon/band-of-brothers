import type { Placement } from "@/lib/types";

/** Points awarded per placement at each event. */
export const PLACEMENT_POINTS: Record<Placement, number> = {
  1: 60,
  2: 40,
  3: 30,
  4: 20,
  5: 10,
  6: 0,
};

export const PLACEMENTS: Placement[] = [1, 2, 3, 4, 5, 6];

export function pointsForPlacement(placement: Placement): number {
  return PLACEMENT_POINTS[placement];
}

export function placementLabel(placement: Placement): string {
  const suffix =
    placement === 1 ? "st" : placement === 2 ? "nd" : placement === 3 ? "rd" : "th";
  return `${placement}${suffix} (+${PLACEMENT_POINTS[placement]})`;
}
