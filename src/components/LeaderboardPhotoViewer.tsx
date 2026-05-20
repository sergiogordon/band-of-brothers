"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

type LeaderboardPhotoViewerProps = {
  name: string;
  avatar: string;
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

export function LeaderboardPhotoViewer({
  name,
  avatar,
  size = "md",
  className = "",
  showRing = false,
  ringClassName = "ring-emerald-300/70",
}: LeaderboardPhotoViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const { width, height, ring } = sizeMap[size];

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group relative shrink-0 overflow-hidden rounded-full bg-emerald-950 outline-none transition duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(25,169,116,0.38)] focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030806] ${
          showRing ? `${ring} ${ringClassName}` : ""
        } ${className}`}
        style={{ width, height }}
        aria-label={`View ${name}'s photo`}
      >
        <Image
          src={avatar}
          alt={name}
          fill
          sizes={`${width}px`}
          className="object-cover [object-position:center_22%] transition duration-300 group-hover:scale-110"
        />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-200/0 transition duration-300 group-hover:bg-emerald-200/10" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#020403]/88 px-4 py-8 backdrop-blur-md [animation:photo-backdrop-in_220ms_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            aria-label="Close photo viewer"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-stone-500/30 bg-stone-950/70 text-2xl leading-none text-stone-100 shadow-lg transition hover:border-emerald-300/60 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            ×
          </button>

          <div
            className="relative w-full max-w-[min(88vw,34rem)] [animation:photo-pop-in_520ms_cubic-bezier(.16,1,.3,1)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute -inset-5 rounded-[2rem] bg-[conic-gradient(from_130deg,rgba(214,179,90,0.35),rgba(25,169,116,0.38),rgba(124,32,47,0.28),rgba(214,179,90,0.35))] opacity-80 blur-2xl [animation:photo-orbit_5s_linear_infinite]" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/25 bg-[#06110e] shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={avatar}
                  alt={name}
                  fill
                  sizes="(min-width: 768px) 34rem, 88vw"
                  className="object-cover [object-position:center_22%]"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/34 to-transparent px-5 pb-5 pt-20">
                  <h3
                    id={titleId}
                    className="text-3xl font-black uppercase tracking-normal text-stone-50 drop-shadow-[0_3px_14px_rgba(0,0,0,0.75)] [animation:name-slam-in_620ms_120ms_cubic-bezier(.18,1.28,.35,1)_both] sm:text-5xl"
                  >
                    {name}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
