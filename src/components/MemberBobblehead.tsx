import { memberById } from "@/data/members";

type MemberBobbleheadProps = {
  memberId: string;
  accentColor?: string;
  tiltDeg?: number;
};

const HEAD_PX = 52;

export function MemberBobblehead({
  memberId,
  accentColor = "#cbd5e1",
  tiltDeg = 0,
}: MemberBobbleheadProps) {
  const member = memberById[memberId];
  if (!member?.bobbleAvatar) return null;

  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          transform: `rotate(${tiltDeg}deg)`,
          filter: `drop-shadow(0 0 3px ${accentColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.45))`,
        }}
      >
        <div
          className="relative"
          style={{ width: HEAD_PX, height: HEAD_PX }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={member.bobbleAvatar}
            alt={member.name}
            width={HEAD_PX}
            height={HEAD_PX}
            className="h-full w-full object-contain object-center"
            decoding="async"
          />
        </div>
      </div>
      <div
        className="mt-0.5 h-1.5 w-2.5 rounded-b-sm"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
    </div>
  );
}
