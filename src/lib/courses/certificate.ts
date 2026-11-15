/**
 * Certificate design, chosen per course in the course builder.
 * Stored as courses.certificate (jsonb). Missing values fall back to DEFAULT_DESIGN.
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
