"use client";

import { useState, useTransition } from "react";
import { PlugZap } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { testVideoConnectionAction } from "@/features/courses/lesson-actions";

export function TestConnectionButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        size="sm"
        className="w-fit"
        loading={pending}
        onClick={() => startTransition(async () => setResult(await testVideoConnectionAction()))}
      >
        <PlugZap className="size-4" aria-hidden="true" /> Test connection
      </Button>
      {result && <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert>}
    </div>
  );
}
