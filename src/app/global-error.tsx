"use client";

/** Last-resort error screen when the whole layout fails. Plain styles: the app's CSS may not have loaded. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, padding: 16 }}>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p style={{ color: "#555" }}>Please try again. If it keeps happening, contact us.</p>
          {error.digest && <p style={{ color: "#777", fontSize: 12 }}>Reference: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 999, border: 0, background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
