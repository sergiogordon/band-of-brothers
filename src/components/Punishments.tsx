import { completedPunishments, availablePunishments } from "@/data/punishments";
import { memberById } from "@/data/members";

export function Punishments() {
  return (
    <section id="punishments" className="scroll-mt-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
            Loser Ledger
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-50">
            Punishments
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">
            Pick once, lock forever. Completed punishments are retired from the
            future loser pool.
          </p>
        </div>
        <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center shadow-inner shadow-stone-950/70 sm:w-auto">
          <p className="text-3xl font-bold text-emerald-200">
            {availablePunishments.length}
          </p>
          <p className="text-xs uppercase tracking-widest text-emerald-300/80">
            Still available
          </p>
        </div>
      </div>

      <div className="space-y-14">
        <div>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-stone-50">
                Previous Punishments
              </h3>
              <p className="text-sm text-stone-400">
                These are already chosen and cannot be picked again.
              </p>
            </div>
            <p className="text-xs uppercase tracking-widest text-red-300/80">
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
                  className="rounded-2xl border border-red-900/45 bg-[linear-gradient(180deg,rgba(124,32,47,0.12),rgba(7,16,13,0.78)_42%,rgba(5,12,10,0.94))] p-4 shadow-inner shadow-stone-950/80 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-200/80">
                        Claimed by {member?.name ?? "Previous loser"}
                      </p>
                      <h4 className="mt-1 text-xl font-semibold text-stone-50">
                        {punishment.title}
                      </h4>
                    </div>
                    <span className="rounded-full border border-red-300/25 bg-red-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-200">
                      Retired
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-stone-50">
                Available Punishments
              </h3>
              <p className="text-sm text-stone-400">
                The remaining pool for future losers.
              </p>
            </div>
            <p className="text-xs uppercase tracking-widest text-emerald-300/80">
              Open pool
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availablePunishments.map((punishment, index) => (
              <article
                key={punishment.id}
                className="flex min-h-32 flex-col justify-between rounded-xl border border-emerald-900/45 bg-[#07100d]/75 p-4 shadow-[0_0_24px_rgba(0,0,0,0.28)]"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/65">
                  Option {index + 1}
                </span>
                <h4 className="mt-3 text-lg font-semibold leading-snug text-stone-50">
                  {punishment.title}
                </h4>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-emerald-300">
                  Available
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
