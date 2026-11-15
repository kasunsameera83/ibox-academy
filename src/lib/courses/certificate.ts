/**
 * Certificate design. The academy has a default (Settings → Certificate,
 * stored in site_settings under DEFAULT_SETTING_KEY); each course uses it
 * unless the course is customised in the course builder (courses.certificate).
 * Missing values fall back to DEFAULT_DESIGN.
 */
export type CertificateTemplate = "prestige" | "bold" | "classic" | "minimal";

export type CertificateDesign = {
  /** Issue a certificate when a learner completes the course. */
  enabled: boolean;
  template: CertificateTemplate;
  /** Accent colour as #rrggbb, or null to follow the brand colour. */
  color: string | null;
  heading: string;
  statement: string;
  /** Optional line under the course title, e.g. "This certificate recognises your dedication…". */
  note: string;
  signerName: string;
  signerTitle: string;
  /** Signature image in the course-media bucket. */
  signaturePath: string | null;
  /** Optional second signer (shown on the Prestige look). */
  signer2Name: string;
  signer2Title: string;
  signature2Path: string | null;
};

export const DEFAULT_DESIGN: CertificateDesign = {
  enabled: true,
  template: "prestige",
  color: null,
  heading: "Certificate of completion",
  statement: "has successfully completed the course",
  note: "",
  signerName: "",
  signerTitle: "",
  signaturePath: null,
  signer2Name: "",
  signer2Title: "",
  signature2Path: null,
};

export const TEMPLATES: { value: CertificateTemplate; label: string; description: string }[] = [
  { value: "prestige", label: "Prestige", description: "Formal, with the logo, a script name, a gold seal and two signatures." },
  { value: "bold", label: "Bold", description: "Playful shapes, a sticker seal and a thick outline." },
  { value: "classic", label: "Classic", description: "Centred, framed and formal. Good for professional courses." },
  { value: "minimal", label: "Minimal", description: "Clean white page with one strong colour band." },
];

export const COLOR_PRESETS: { label: string; value: string | null }[] = [
  { label: "Brand colour", value: null },
  { label: "Midnight", value: "#1f2a44" },
  { label: "Ocean", value: "#1e6fd9" },
  { label: "Emerald", value: "#0f8a5f" },
  { label: "Rose", value: "#d9366b" },
  { label: "Gold", value: "#b8860b" },
];

export const LIMITS = { heading: 60, statement: 120, note: 160, signerName: 80, signerTitle: 80 } as const;

const HEX = /^#[0-9a-f]{6}$/i;

function text(value: unknown, fallback: string, max: number) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

/** Turn whatever is stored into a complete, safe design. */
export function parseDesign(raw: unknown): CertificateDesign {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const template = TEMPLATES.some((t) => t.value === r.template) ? (r.template as CertificateTemplate) : DEFAULT_DESIGN.template;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : DEFAULT_DESIGN.enabled,
    template,
    color: typeof r.color === "string" && HEX.test(r.color) ? r.color.toLowerCase() : null,
    heading: text(r.heading, DEFAULT_DESIGN.heading, LIMITS.heading).trim() || DEFAULT_DESIGN.heading,
    statement: text(r.statement, DEFAULT_DESIGN.statement, LIMITS.statement).trim() || DEFAULT_DESIGN.statement,
    signerName: text(r.signerName, "", LIMITS.signerName).trim(),
    signerTitle: text(r.signerTitle, "", LIMITS.signerTitle).trim(),
    signaturePath: typeof r.signaturePath === "string" && r.signaturePath.startsWith("courses/") ? r.signaturePath : null,
    note: text(r.note, "", LIMITS.note).trim(),
    signer2Name: text(r.signer2Name, "", LIMITS.signerName).trim(),
    signer2Title: text(r.signer2Title, "", LIMITS.signerTitle).trim(),
    signature2Path: typeof r.signature2Path === "string" && r.signature2Path.startsWith("courses/") ? r.signature2Path : null,
  };
}

export function isHexColor(value: string) {
  return HEX.test(value);
}

/** site_settings key holding the academy-wide default design. */
export const DEFAULT_SETTING_KEY = "certificate_default";
/** Storage folder for the default design's signature images. */
export const DEFAULT_SIGNATURE_DIR = "courses/default";

function asObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** True when a course follows the academy default (new courses do until customised). */
export function usesDefault(courseRaw: unknown): boolean {
  const r = asObject(courseRaw);
  return r.useDefault === true || Object.keys(r).length === 0;
}

/** True when the course has its own saved design (kept even while it follows the default). */
export function hasCustomDesign(courseRaw: unknown): boolean {
  return Object.keys(asObject(courseRaw)).some((k) => k !== "useDefault" && k !== "enabled");
}

/** The design a course's certificates actually show. Whether to issue one is always the course's choice. */
export function effectiveDesign(courseRaw: unknown, defaultRaw: unknown): CertificateDesign {
  if (!usesDefault(courseRaw)) return parseDesign(courseRaw);
  const enabled = asObject(courseRaw).enabled;
  return { ...parseDesign(defaultRaw), enabled: typeof enabled === "boolean" ? enabled : true };
}
