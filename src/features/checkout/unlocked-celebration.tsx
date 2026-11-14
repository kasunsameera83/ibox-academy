import { Sparkles } from "lucide-react";

const CONFETTI = [
  { x: "8%", y: "18%", c: "bg-accent", r: "rotate-12", d: 120, s: "h-3 w-6" },
  { x: "88%", y: "12%", c: "bg-brand", r: "-rotate-12", d: 220, s: "h-3 w-3 rounded-full" },
  { x: "92%", y: "62%", c: "bg-lilac", r: "rotate-45", d: 320, s: "h-4 w-4" },
  { x: "4%", y: "70%", c: "bg-success", r: "rotate-6", d: 260, s: "h-3 w-3 rounded-full" },
  { x: "22%", y: "4%", c: "bg-brand", r: "rotate-45", d: 380, s: "h-2 w-5" },
  { x: "74%", y: "90%", c: "bg-accent", r: "-rotate-6", d: 440, s: "h-3 w-3 rounded-full" },
  { x: "60%", y: "2%", c: "bg-success", r: "rotate-12", d: 180, s: "h-2 w-4" },
  { x: "16%", y: "92%", c: "bg-lilac", r: "-rotate-12", d: 500, s: "h-2 w-5" },
];

/** The "course unlocked" graphic for a paid order: the course cover popping out with confetti. */
export function UnlockedCelebration({ title, thumbnail }: { title: string; thumbnail: string | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px] px-6 pb-4 pt-6" aria-hidden="true">
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className={`rise-in absolute ${p.s} ${p.c} ${p.r}`}
          style={{ left: p.x, top: p.y, ["--delay" as string]: `${p.d}ms` }}
        />
      ))}

      {/* Back card: a second "ticket" peeking out for depth */}
      <div className="absolute inset-x-12 bottom-2 top-10 rotate-[-5deg] rounded-[22px] bg-lilac" />

      <div className="rise-in relative overflow-hidden rounded-[22px] border-2 border-ink bg-surface shadow-[6px_6px_0_0_var(--color-ink)]" style={{ ["--tilt" as string]: "2deg" }}>
        <div className="relative aspect-video w-full bg-brand">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- media host is configurable; matches other course thumbnails
            <img src={thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex h-full items-end p-5">
              <p className="line-clamp-3 text-2xl font-extrabold leading-tight text-on-brand">{title}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-bold text-ink">Unlocked</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success-ink">
            <span className="size-1.5 rounded-full bg-success" /> Ready to watch
          </span>
        </div>
      </div>

      {/* Sticker */}
      <div
        className="rise-in absolute -right-1 -top-1 flex size-20 flex-col items-center justify-center rounded-full border-2 border-ink bg-accent text-center text-on-accent shadow-[3px_3px_0_0_var(--color-ink)]"
        style={{ ["--tilt" as string]: "-12deg", ["--delay" as string]: "350ms" }}
      >
        <Sparkles className="size-5" />
        <span className="text-[11px] font-extrabold leading-tight">You're in!</span>
      </div>
    </div>
  );
}
