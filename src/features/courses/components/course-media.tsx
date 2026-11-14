"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayCircle } from "lucide-react";

/**
 * Media at the top of the buy panel: plays the intro video in place,
 * or links to the first free preview lesson when there's no intro.
 */
export function CourseMedia({
  title,
  thumbnailUrl,
  introEmbedUrl,
  previewHref,
  previewLabel,
}: {
  title: string;
  thumbnailUrl: string | null;
  introEmbedUrl: string | null;
  previewHref: string | null;
  previewLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (introEmbedUrl && playing) {
    return (
      <div className="aspect-video bg-ink">
        <iframe
          src={`${introEmbedUrl}&autoplay=true`}
          title={`Intro video: ${title}`}
          className="size-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
        />
      </div>
    );
  }

  const badge = (label: string) => (
    <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink">
      <PlayCircle className="size-5 text-brand" aria-hidden="true" /> {label}
    </span>
  );

  return (
    <div className="relative aspect-video bg-brand">
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="size-full object-cover" />
      )}
      {introEmbedUrl ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 flex items-center justify-center bg-ink/30 transition-colors hover:bg-ink/45"
        >
          {badge("Watch the intro")}
        </button>
      ) : (
        previewHref && (
          <Link href={previewHref} className="absolute inset-0 flex items-center justify-center bg-ink/30 transition-colors hover:bg-ink/45">
            {badge(previewLabel)}
          </Link>
        )
      )}
    </div>
  );
}
