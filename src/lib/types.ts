export type Member = {
  id: string;
  name: string;
  avatar: string;
  bobbleAvatar?: string;
};

export type StandingEntry = {
  memberId: string;
  points: number;
};

export type EventType = "golf" | "poker" | "bowling";

export type EventSnapshot = {
  id: string;
  name: string;
  eventType: EventType;
  venue?: string;
  date: string;
  standings: StandingEntry[];
};

export type Placement = 1 | 2 | 3 | 4 | 5 | 6;

export type EventPlacement = {
  memberId: string;
  placement: Placement;
};

export type RankedMember = {
  memberId: string;
  points: number;
  rank: number;
  gapToLeader: number;
};

export type FutureEventSlot = {
  id: string;
  label: string;
  month: number;
  year: number;
};

export type StoredEventResult = {
  id: string;
  slotId: string;
  name: string;
  eventType: EventType;
  date: string;
  placements: Record<string, Placement | "">;
};

export type PunishmentMedia = {
  type: "image" | "video";
  src: string;
  alt?: string;
  label?: string;
  width?: number;
  height?: number;
};

export type Punishment = {
  id: string;
  title: string;
  status: "available" | "completed";
  chosenByMemberId?: string;
  media?: PunishmentMedia[];
};

export type SeasonState = {
  events: EventSnapshot[];
  drafts: StoredEventResult[];
};
