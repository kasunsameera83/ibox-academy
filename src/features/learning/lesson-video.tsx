"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setLessonCompleteAction } from "./actions";

const PLAYER_ORIGIN = "https://iframe.mediadelivery.net";

/**
 * Bunny Stream embed. Bunny speaks the player.js protocol, so we ask it to
 * tell us when the video ends and then mark the lesson complete.
 */
export function LessonVideo({
  src,
  title,
  lessonId,
  slug,
  autoComplete,
}: {
  src: string;
  title: string;
  lessonId: string;
  slug: string;
  /** True for enrolled learners who haven't completed the lesson yet. */
  autoComplete: boolean;
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!autoComplete) return;
    doneRef.current = false;
    const send = (method: string, value?: string) =>
      frameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method, value, listener: value }),
        PLAYER_ORIGIN,
      );

    function onMessage(event: MessageEvent) {
      if (event.origin !== PLAYER_ORIGIN || event.source !== frameRef.current?.contentWindow) return;
      let data: { context?: string; event?: string } | null = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.context !== "player.js") return;
      if (data.event === "ready") send("addEventListener", "ended");
      if (data.event === "ended" && !doneRef.current) {
        doneRef.current = true;
        void setLessonCompleteAction(lessonId, slug, true).then((res) => res.ok && router.refresh());
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [autoComplete, lessonId, slug, router]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className="size-full border-0"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="origin"
    />
  );
}
