# Fixture generation scripts

This directory will contain a Phase 2 script that generates `.pdf` and `.docx`
binary fixtures from the source-of-truth `.txt` and `.md` files in
`../resumes/`.

The goal: keep the test corpus diff-able in git (humans review text changes)
while still having binary fixtures available for parser testing. The generator
is the only place that touches binary formats; never hand-edit a `.pdf` or
`.docx` and check it in.

Implementation lands in Phase 2 alongside the parsing libraries.
