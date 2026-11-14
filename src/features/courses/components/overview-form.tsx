"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/forms";
import { LANGUAGE_LABELS, LEVEL_LABELS, type Category, type Course } from "@/lib/courses/types";
import { saveOverviewAction } from "../actions";

export function OverviewForm({ course, categories }: { course: Course; categories: Category[] }) {
  const [state, formAction, pending] = useActionState(saveOverviewAction, initialFormState);
  const v = state.values;
  const err = (k: string) => state.fieldErrors?.[k]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={course.id} />
      <Input label="Title" name="title" required maxLength={120} defaultValue={v?.title ?? course.title} error={err("title")} />
      <Input
        label="Web address"
        name="slug"
        required
        maxLength={100}
        defaultValue={v?.slug ?? course.slug}
        hint={<>Your course page will be at /courses/<strong>{v?.slug ?? course.slug}</strong>. Changing it after publishing breaks shared links.</>}
        error={err("slug")}
      />
      <Input
        label="Short description"
        name="subtitle"
        maxLength={200}
        defaultValue={v?.subtitle ?? course.subtitle ?? ""}
        hint="One sentence on what learners will be able to do. Shown on course cards."
        error={err("subtitle")}
      />
      <Textarea
        label="Full description"
        name="description"
        rows={8}
        defaultValue={v?.description ?? course.description ?? ""}
        hint="What the course covers, how it's taught and why it matters. Line breaks are kept."
        error={err("description")}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <Select
          label="Category"
          name="categoryId"
          placeholder="Choose a category"
          defaultValue={v?.categoryId ?? course.category_id ?? ""}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          error={err("categoryId")}
        />
        <Select
          label="Level"
          name="level"
          defaultValue={v?.level ?? course.level}
          options={Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          label="Teaching language"
          name="language"
          defaultValue={v?.language ?? course.language}
          options={Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <div>
        <Button type="submit" loading={pending}>Save overview</Button>
      </div>
    </form>
  );
}
