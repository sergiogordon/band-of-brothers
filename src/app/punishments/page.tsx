import Image from "next/image";
import Link from "next/link";
import { completedPunishments, availablePunishments } from "@/data/punishments";
import { memberById } from "@/data/members";
import type { PunishmentMedia } from "@/lib/types";

function MediaFrame({ media }: { media: PunishmentMedia }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/70">
      {media.type === "image" ? (
        <Image
          src={media.src}
          alt={media.alt ?? ""}
          width={media.width ?? 720}
          height={media.height ?? 720}
          className="h-auto w-full"
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
        />
      ) : (
        <video
          src={media.src}
          controls
          preload="metadata"
          className="h-auto w-full bg-black"
        />
      )}
      {media.label && (
        <p className="border-t border-slate-800 px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          {media.label}
        </p>
      )}
    </div>
  );
}

export default function PunishmentsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            Back to leaderboard
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            Loser Ledger
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Punishments
              </h1>
              <p className="mt-2 max-w-2xl text-slate-400">
                Pick once, lock forever. Completed punishments are retired from
                the future loser pool.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center">
              <p className="text-3xl font-bold text-amber-300">
                {availablePunishments.length}
              </p>
              <p className="text-xs uppercase tracking-widest text-amber-400/80">
                Still available
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 sm:py-16">
        <section>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Previous Punishments
              </h2>
              <p className="text-sm text-slate-400">
                These are already chosen and cannot be picked again.
              </p>
            </div>
            <p className="text-xs uppercase tracking-widest text-amber-400/80">
              Locked
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {completedPunishments.map((punishment) => {
              const member = punishment.chosenByMemberId
                ? memberById[punishment.chosenByMemberId]
                : null;

              return (
                <article
                  key={punishment.id}
                  className="rounded-2xl border border-amber-400/25 bg-slate-900/70 p-4 shadow-[0_0_24px_rgba(15,23,42,0.5)] sm:p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                        Claimed by {member?.name ?? "Previous loser"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-white">
                        {punishment.title}
                      </h3>
                    </div>
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      Retired
                    </span>
                  </div>

                  {punishment.media && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {punishment.media.map((media) => (
                        <MediaFrame key={media.src} media={media} />
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Available Punishments
              </h2>
              <p className="text-sm text-slate-400">
                The remaining pool for future losers.
              </p>
            </div>
            <p className="text-xs uppercase tracking-widest text-amber-400/80">
              Open pool
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availablePunishments.map((punishment, index) => (
              <article
                key={punishment.id}
                className="flex min-h-32 flex-col justify-between rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 shadow-[0_0_24px_rgba(15,23,42,0.35)]"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Option {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold leading-snug text-white">
                  {punishment.title}
                </h3>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-emerald-300">
                  Available
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        Band of Brothers · Punishments stay retired
      </footer>
    </div>
  );
}
