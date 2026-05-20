import type { Member } from "@/lib/types";

export const members: Member[] = [
  {
    id: "jack",
    name: "Jack",
    avatar: "/members/jack.png",
    bobbleAvatar: "/members/bobble-faces-clean/jack.png",
  },
  {
    id: "sergio",
    name: "Sergio",
    avatar: "/members/sergio.png",
    bobbleAvatar: "/members/bobble-faces-clean/sergio.png",
  },
  {
    id: "shadi",
    name: "Shadi",
    avatar: "/members/shadi.png",
    bobbleAvatar: "/members/bobble-faces-clean/shadi.png",
  },
  {
    id: "sam",
    name: "Sam",
    avatar: "/members/sam.png",
    bobbleAvatar: "/members/bobble-faces-clean/sam.png",
  },
  {
    id: "aaron",
    name: "Aaron",
    avatar: "/members/aaron.png",
    bobbleAvatar: "/members/bobble-faces-clean/aaron.png",
  },
  {
    id: "nigel",
    name: "Nigel",
    avatar: "/members/nigel.png",
    bobbleAvatar: "/members/bobble-faces-clean/nigel.png",
  },
];

export const memberById = Object.fromEntries(
  members.map((m) => [m.id, m]),
) as Record<string, Member>;
