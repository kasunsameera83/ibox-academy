import type { FormState } from "@/lib/forms";
import { Alert } from "./alert";

export function FormFeedback({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}
