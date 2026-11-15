import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^https:/, "wss:");

/**
 * Content Security Policy: which outside sites the browser may load from.
 * Sent as "Report-Only" first: the browser logs anything it would have
 * blocked (see the console) without breaking the page. After a clean week
 * on the live site, change the header name to "Content-Security-Policy".
 */
const csp = [
  "default-src 'self'",
  // Next.js adds small inline scripts; nonces can tighten this later.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase} https://*.b-cdn.net https://lh3.googleusercontent.com`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://video.bunnycdn.com`,
  "media-src 'self' blob: https://*.b-cdn.net",
  "frame-src https://iframe.mediadelivery.net",
  "form-action 'self' https://www.payhere.lk https://sandbox.payhere.lk",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      {
        // The website editor shows draft previews in a same-site frame.
        // Later rules win, so this relaxes DENY for these pages only.
        source: "/cms-preview/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Content-Security-Policy-Report-Only", value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
