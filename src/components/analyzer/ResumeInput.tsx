"use client";

import { useCallback, useRef, useState } from "react";
import { detectFormat } from "@/lib/parsing";
import type { DocumentFormat } from "@/lib/parsing/types";

export type ResumeInputValue =
  | {
      kind: "text";
      format: "txt" | "md";
      content: string;
      filename: string;
    }
  | {
      kind: "binary";
      format: "pdf" | "docx";
      content: ArrayBuffer;
      filename: string;
    };

interface Props {
  value: ResumeInputValue | null;
  onChange: (value: ResumeInputValue | null) => void;
  onError: (message: string) => void;
}

const ACCEPT = ".pdf,.docx,.txt,.md";

export function ResumeInput({ value, onChange, onError }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const format = detectFormat(file.name, file.type);
      if (!format) {
        onError(
          `Unsupported file type: ${file.name}. Use PDF, DOCX, TXT, or MD.`,
        );
        return;
      }
      try {
        if (format === "txt" || format === "md") {
          const content = await file.text();
          onChange({
            kind: "text",
            format,
            content,
            filename: file.name,
          });
        } else {
          const content = await file.arrayBuffer();
          onChange({
            kind: "binary",
            format: format as Extract<DocumentFormat, "pdf" | "docx">,
            content,
            filename: file.name,
          });
        }
      } catch (err) {
        onError(`Could not read file: ${(err as Error).message}`);
      }
    },
    [onChange, onError],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">Resume</label>
      <div
        className={[
          "flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 px-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 hover:bg-muted/50",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        {value ? (
          <>
            <p className="text-sm font-medium">{value.filename}</p>
            <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">
              {value.format} · ready
            </p>
            <button
              className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              Replace
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drop your resume here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, TXT, or MD · processed entirely in your browser
            </p>
          </>
        )}
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
    </div>
  );
}
