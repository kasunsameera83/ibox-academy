/** Shape returned by Server Actions used with useActionState. */
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Echoed back so non-secret input survives a failed submit. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};
