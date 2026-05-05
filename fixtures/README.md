# Fixtures

All fixtures here are **entirely fictional** — names, companies, schools, dates, and
projects were generated for testing. None of these correspond to real people. Do
not replace these with real personal documents inside the repo.

## Resumes (`resumes/`)

Three resumes designed to exercise different parsing paths and score outcomes:

| File                                 | Format | Purpose                                                                                   |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| `jane-doe-backend.txt`               | TXT    | Clean plain-text resume for the backend engineer JD. Should score well on parseability.   |
| `alex-kim-frontend.md`               | MD     | Markdown resume targeting the frontend JD.                                                |
| `priya-rao-data-scientist.txt`       | TXT    | Plain-text resume targeting the data scientist JD, intentionally weak on keyword overlap. |

PDF and DOCX variants are generated from these source files in Phase 2 once
the parsing libraries are wired up. The `scripts/` directory will contain a
small generator that produces the binary formats from these source-of-truth
text files (so the test corpus stays diff-able in git).

## Job descriptions (`jds/`)

| File                          | Pairs with                          | Notable features                                                              |
| ----------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `backend-engineer-acme.txt`   | jane-doe-backend                    | Clear "Required" vs. "Preferred" sections, explicit years-of-experience min.  |
| `frontend-engineer-novacart.txt` | alex-kim-frontend                | Mixed must-have/nice-to-have markers, soft-skill heavy.                       |
| `data-scientist-helix.txt`    | priya-rao-data-scientist            | Strong keyword density, certifications listed as required.                    |

## Conventions

- Names follow a "first-last-role" slug pattern.
- Companies are fictional ("Acme Corp", "NovaCart", "Helix Analytics") — chosen
  to be obviously made up.
- Dates use realistic ranges in the 2018–2025 window so years-of-experience
  parsing has something to compute.
- Each JD uses different linguistic markers ("required", "must have",
  "preferred", "nice to have") so the must-have classifier gets a real test.
