# ATS Resume Analyzer

A free, **open-source** ATS resume analyzer with documented scoring math.
Upload a resume and a job description, get a multi-dimensional readiness report —
keyword match, semantic similarity, hard requirements, and parseability. Every
score traces back to its inputs.

> Status: **Phase 1** — scaffolding complete. Parsing, scoring, and the report
> UI land in subsequent phases.

## Stack

- Next.js 16 (App Router) with TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui (neutral default theme)
- Deployed on Vercel as static + edge assets — no Node serverless functions
- All processing client-side: pdfjs-dist, mammoth, compromise, transformers.js

See `./fixtures/README.md` for the test corpus and the project root spec for
the full architecture.

## Local development

```bash
nvm use            # picks Node 20 from .nvmrc
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Command          | Purpose                          |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Local dev server                 |
| `pnpm build`     | Production build                 |
| `pnpm start`     | Run the production build locally |
| `pnpm lint`      | ESLint                           |
| `pnpm typecheck` | TypeScript without emitting      |

## Routes

- `/` — landing page
- `/analyze` — upload and analyze (Phase 5)
- `/methodology` — full scoring methodology

## License

MIT (to be added).
