import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../fixtures");

export const RESUMES_DIR = path.join(ROOT, "resumes");
export const JDS_DIR = path.join(ROOT, "jds");

export function loadFixtureText(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

export function loadFixtureBuffer(rel: string): ArrayBuffer {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  // Slice to ensure we return a true ArrayBuffer, not a Buffer's underlying
  // pool which may be larger than the file's bytes.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}
