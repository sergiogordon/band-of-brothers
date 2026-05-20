import Image from "next/image";
import { memberById } from "@/data/members";

type MemberAvatarProps = {
  memberId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showRing?: boolean;
  ringClassName?: string;
};

const sizeMap = {
  sm: { width: 40, height: 40, ring: "ring-2" },
  md: { width: 56, height: 56, ring: "ring-2" },
  lg: { width: 60, height: 50, ring: "ring-4" },
};

export function MemberAvatar({
  memberId,
  size = "md",
  className = "",
  showRing = false,
  ringClassName = "ring-emerald-300/70",
}: MemberAvatarProps) {
  const member = memberById[memberId];
  if (!member) return null;

  const { width, height, ring } = sizeMap[size];

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-emerald-950 ${
        showRing ? `${ring} ${ringClassName}` : ""
      } ${className}`}
      style={{ width, height }}
    >
      <Image
        src={member.avatar}
        alt={member.name}
        fill
        sizes={`${width}px`}
        className="object-cover [object-position:center_22%]"
      />
    </div>
  );
}
