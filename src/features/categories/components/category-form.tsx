"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/forms";
import type { Category } from "@/lib/courses/types";
import { saveCategoryAction } from "../actions";

export function CategoryForm({ category }: { category?: Category }) {
  const [state, formAction, pending] = useActionState(saveCategoryAction, initialFormState);
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormFeedback state={state} />
      {category && <input type="hidden" name="id" value={category.id} />}
      <Input label="Name" name="name" required defaultValue={v?.name ?? category?.name} error={state.fieldErrors?.name?.[0]} />
      <Input
        label="Web address (slug)"
        name="slug"
        defaultValue={v?.slug ?? category?.slug}
        hint="Used in links like /courses?category=design. Leave empty to create it from the name."
        error={state.fieldErrors?.slug?.[0]}
      />
      <Textarea
        label="Short description"
        name="description"
        rows={3}
        defaultValue={v?.description ?? category?.description ?? ""}
        error={state.fieldErrors?.description?.[0]}
      />
      <Input
        label="Display order"
        name="sortOrder"
        type="number"
        min={0}
        max={999}
        defaultValue={v?.sortOrder ?? String(category?.sort_order ?? 0)}
        hint="Lower numbers appear first."
        error={state.fieldErrors?.sortOrder?.[0]}
      />
      <Checkbox
        label="Show on the website"
        name="isVisible"
        defaultChecked={category ? category.is_visible : true}
        hint="Hidden categories stay available in the course builder."
      />
      <div>
        <Button type="submit" loading={pending}>{category ? "Save category" : "Add category"}</Button>
      </div>
    </form>
  );
}
