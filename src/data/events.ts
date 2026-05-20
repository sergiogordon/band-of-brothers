import type { EventSnapshot, FutureEventSlot } from "@/lib/types";

/** Cumulative standings after each event, chronological. */
export const events: EventSnapshot[] = [
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
];

export const futureEventSlots: FutureEventSlot[] = [
  { id: "jun-2026", label: "June 2026", month: 6, year: 2026 },
  { id: "jul-2026", label: "July 2026", month: 7, year: 2026 },
  { id: "aug-2026", label: "August 2026", month: 8, year: 2026 },
  { id: "sep-2026", label: "September 2026", month: 9, year: 2026 },
  { id: "oct-2026", label: "October 2026", month: 10, year: 2026 },
  { id: "nov-2026", label: "November 2026", month: 11, year: 2026 },
  { id: "dec-2026", label: "December 2026", month: 12, year: 2026 },
];
