import type { ContactFields } from "./types";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const LINKEDIN_RE = /linkedin\.com\/(in|pub|company)\//i;
const LOCATION_RE = /[A-Z][a-zA-Z .'-]+,\s*[A-Z]{2,}/;

/** Detect which standard contact fields appear anywhere in the resume text. */
export function detectContactFields(text: string): ContactFields {
  return {
    email: EMAIL_RE.test(text),
    phone: PHONE_RE.test(text),
    linkedin: LINKEDIN_RE.test(text),
    location: LOCATION_RE.test(text),
  };
}
