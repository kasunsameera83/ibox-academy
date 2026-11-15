import "server-only";
import { DEFAULT_SETTING_KEY, parseDesign, type CertificateDesign } from "@/lib/courses/certificate";
import { createClient } from "@/lib/supabase/server";

/** The academy-wide default certificate (public setting: it's printed on public certificates). */
export async function getDefaultCertificate(): Promise<{ raw: unknown; design: CertificateDesign }> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", DEFAULT_SETTING_KEY).maybeSingle();
  const raw = (data as { value: unknown } | null)?.value ?? {};
  return { raw, design: parseDesign(raw) };
}
