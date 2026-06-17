import Image from "next/image";
import type { EventType, KnownEventType } from "@/lib/types";

type EventIconProps = {
  type: EventType;
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
} as const;

const eventImages: Record<KnownEventType, string> = {
  golf: "/events/puttshack.png",
  poker: "/events/poker-night.png",
  bowling: "/events/bowling.png",
};

export function EventIcon({
  type,
  size = "sm",
  className = "",
}: EventIconProps) {
  const imageSrc =
    type in eventImages
      ? eventImages[type as KnownEventType]
      : eventImages.poker;

  return (
    <Image
      src={imageSrc}
      alt=""
      width={64}
      height={64}
      className={`${sizeClasses[size]} shrink-0 rounded-full object-cover ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
