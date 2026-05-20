import type { Punishment } from "@/lib/types";

export const punishments: Punishment[] = [
  {
    id: "restaurant-song",
    title: "Sing a song in a restaurant",
    status: "available",
  },
  {
    id: "buzz-cut",
    title: "Shave your head (buzz cut)",
    status: "completed",
    chosenByMemberId: "nigel",
    media: [
      {
        type: "image",
        src: "/punishments/nigel-shave.jpg",
        alt: "Nigel after the buzz cut punishment",
        label: "Nigel",
        width: 2316,
        height: 3088,
      },
    ],
  },
  {
    id: "daisy-dukes",
    title: "Daisy Dukes in public",
    status: "available",
  },
  {
    id: "interpretive-dance",
    title: "Do an interpretive dance somewhere in public",
    status: "available",
  },
  {
    id: "plate-food",
    title: "Eat something off someone's plate",
    status: "available",
  },
  {
    id: "nose-wax",
    title: "Wax hairs in the nose",
    status: "completed",
    chosenByMemberId: "sam",
    media: [
      {
        type: "image",
        src: "/punishments/sam-nose-wax.png",
        alt: "Sam with nose wax strips",
        label: "Photo",
        width: 576,
        height: 580,
      },
      {
        type: "video",
        src: "https://duj9ui45abgcixri.public.blob.vercel-storage.com/Sam%20nose.mp4",
        label: "Video",
        width: 960,
        height: 540,
      },
    ],
  },
  {
    id: "statue",
    title: "Pretend to be a statue for 30 minutes",
    status: "available",
  },
  {
    id: "prank-call-wife",
    title: "Prank call a wife",
    status: "available",
  },
  {
    id: "dog-food",
    title: "Eat dog food",
    status: "available",
  },
];

export const availablePunishments = punishments.filter(
  (punishment) => punishment.status === "available",
);

export const completedPunishments = punishments.filter(
  (punishment) => punishment.status === "completed",
);
