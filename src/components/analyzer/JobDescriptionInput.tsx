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

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium" htmlFor="jd-textarea">
          Job description
        </label>
        <button
          type="button"
          className="text-xs text-muted-foreground underline hover:text-foreground"
          onClick={() => inputRef.current?.click()}
        >
          Upload .txt / .md
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
        className="min-h-[160px] font-mono text-sm"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        {value.length === 0
          ? "Including the requirements and preferred-qualifications sections gives the best results."
          : `${value.length.toLocaleString()} characters · ${value
              .trim()
              .split(/\s+/)
              .filter(Boolean).length.toLocaleString()} words`}
      </p>
    </div>
  );
}
