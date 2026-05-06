"use client";

import { useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}

const ACCEPT = ".txt,.md";

export function JobDescriptionInput({ value, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "txt" && ext !== "md") {
        onError(
          `Job descriptions support TXT or MD upload only. To analyze a PDF JD, copy its text into the box.`,
        );
        return;
      }
      try {
        const content = await file.text();
        onChange(content);
      } catch (err) {
        onError(`Could not read file: ${(err as Error).message}`);
      }
    },
    [onChange, onError],
  );

  const charCount = value.length;
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <label className="text-sm font-medium text-foreground" htmlFor="jd-textarea">
          Job description
        </label>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => inputRef.current?.click()}
        >
          Upload TXT / MD
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      <Textarea
        id="jd-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here, or upload a TXT/MD file."
        // Override shadcn's `field-sizing-content` so the textarea no
        // longer grows to fit its contents — long JDs would otherwise
        // push the Analyze CTA below the fold. h-44 matches the resume
        // dropzone height; the textarea scrolls internally past that.
        className="h-44 resize-none bg-card font-sans text-sm leading-relaxed [field-sizing:fixed]"
      />
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        {value.length === 0
          ? "Tip: include the requirements and preferred-qualifications sections for the best signal."
          : `${charCount.toLocaleString()} chars · ${wordCount.toLocaleString()} words`}
      </p>
    </div>
  );
}
